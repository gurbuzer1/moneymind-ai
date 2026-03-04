import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../src/theme';
import { useChatStore } from '../../src/stores';
import { useDatabase } from '../../src/db/DatabaseProvider';
import { computeFinancialContext } from '../../src/utils/financialContext';
import { ChatMessage } from '../../src/types';

export default function ChatScreen() {
  const db = useDatabase();
  const { messages, sending, loadMessages, sendMessage } = useChatStore();
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);

  useFocusEffect(
    useCallback(() => {
      loadMessages(db);
    }, [db])
  );

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    const context = await computeFinancialContext(db);
    await sendMessage(db, text, context);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <MaterialIcons name="smart-toy" size={16} color={colors.primary} />
          </View>
        )}
        <View style={[styles.messageContent, isUser ? styles.userContent : styles.aiContent]}>
          <Text style={[styles.messageText, isUser && styles.userText]}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <MaterialIcons name="smart-toy" size={48} color={colors.primaryLight} />
            <Text style={styles.emptyTitle}>MoneyMind AI</Text>
            <Text style={styles.emptyDesc}>
              Ask me anything about your finances. I can analyze your spending, suggest savings, and help you budget better.
            </Text>
            <View style={styles.suggestions}>
              {[
                'How am I spending this month?',
                'Where can I cut costs?',
                'Help me make a budget',
              ].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={styles.suggestion}
                  onPress={() => {
                    setInput(s);
                  }}
                >
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
      />

      {sending && (
        <View style={styles.typingIndicator}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.typingText}>MoneyMind is thinking...</Text>
        </View>
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask about your finances..."
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={1000}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          onPress={handleSend}
          style={[styles.sendButton, (!input.trim() || sending) && styles.sendDisabled]}
          disabled={!input.trim() || sending}
        >
          <MaterialIcons name="send" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  messageList: { padding: spacing.md, paddingBottom: spacing.sm },
  bubble: { flexDirection: 'row', marginBottom: spacing.sm, maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end' },
  aiBubble: { alignSelf: 'flex-start', gap: spacing.sm },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  messageContent: { borderRadius: borderRadius.lg, padding: spacing.sm, paddingHorizontal: spacing.md },
  userContent: { backgroundColor: colors.primary },
  aiContent: { backgroundColor: colors.surface },
  messageText: { ...typography.body, color: colors.text },
  userText: { color: '#fff' },
  emptyChat: { alignItems: 'center', paddingTop: 60, padding: spacing.xl },
  emptyTitle: { ...typography.h2, color: colors.text, marginTop: spacing.md },
  emptyDesc: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
  suggestions: { marginTop: spacing.lg, gap: spacing.sm, width: '100%' },
  suggestion: {
    borderWidth: 1,
    borderColor: colors.primary + '40',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  suggestionText: { ...typography.caption, color: colors.primary, textAlign: 'center' },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  typingText: { ...typography.small, color: colors.textSecondary },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.5 },
});
