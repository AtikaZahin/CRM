import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { GlassCard } from '../components/GlassCard';
import { api } from '../services/api';

export const AgentScreen = () => {
  const [messages, setMessages] = useState([
    { id: '0', text: 'Hello! I am your Antigravity CRM Assistant. I can help you manage leads, fetch contacts, or draft emails.', isBot: true }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage = input.trim();
    setMessages(prev => [...prev, { id: Date.now().toString(), text: userMessage, isBot: false }]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/ai/chat', { message: userMessage });
      const botReply = response.data.response || "Done.";
      setMessages(prev => [...prev, { id: Date.now().toString(), text: botReply, isBot: true }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: Date.now().toString(), text: "Error connecting to AI Agent. Make sure the backend is running.", isBot: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>AI Agent</Text>
      
      <ScrollView contentContainerStyle={styles.chatArea}>
        {messages.map(msg => (
          <View key={msg.id} style={msg.isBot ? styles.messageRowBot : styles.messageRowUser}>
            <GlassCard style={msg.isBot ? styles.botBubble : styles.userBubble}>
              <Text style={msg.isBot ? styles.botText : styles.userText}>{msg.text}</Text>
            </GlassCard>
          </View>
        ))}
        {loading && (
          <View style={styles.messageRowBot}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput 
          style={styles.input} 
          placeholder="Ask me anything..." 
          placeholderTextColor={colors.textSecondary}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={loading}>
          <Send color="white" size={20} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  chatArea: {
    padding: 20,
    flexGrow: 1,
  },
  messageRowBot: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 16,
  },
  messageRowUser: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  botBubble: {
    maxWidth: '85%',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  userBubble: {
    maxWidth: '85%',
    backgroundColor: colors.primary,
    borderColor: colors.primaryHover,
  },
  botText: {
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 24,
  },
  userText: {
    color: 'white',
    fontSize: 16,
    lineHeight: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 24,
    backgroundColor: colors.surfaceSolid,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.textPrimary,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
