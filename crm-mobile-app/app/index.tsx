import React, { useState, useRef, useEffect } from 'react';
import { View, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Alert, SafeAreaView, TouchableOpacity } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MessageBubble } from '../components/MessageBubble';
import { InputBar } from '../components/InputBar';
import api from '../services/api';
import { logout, getToken } from '../services/auth';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hello! I am your CRM AI Assistant. How can I help you today?', isUser: false }
  ]);
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const navigation = useNavigation();

  useEffect(() => {
    // Check auth
    const checkAuth = async () => {
      const token = await getToken();
      if (!token) {
        router.replace('/login');
      }
    };
    checkAuth();
    
    // Add logout button to header
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          onPress={async () => {
            await logout();
            router.replace('/login');
          }}
          style={{ marginRight: 16 }}
        >
          <Ionicons name="log-out-outline" size={24} color="#0a7ea4" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const handleSend = async (text: string) => {
    const newUserMessage: Message = { id: Date.now().toString(), text, isUser: true };
    setMessages(prev => [...prev, newUserMessage]);
    setLoading(true);

    try {
      const response = await api.post('/ai/chat', { message: text });
      const aiResponseText = response.data?.response || 'Action completed.';
      
      const newAiMessage: Message = { 
        id: (Date.now() + 1).toString(), 
        text: aiResponseText, 
        isUser: false 
      };
      setMessages(prev => [...prev, newAiMessage]);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to communicate with the AI agent.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <MessageBubble text={item.text} isUser={item.isUser} />}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
        <InputBar onSend={handleSend} isLoading={loading} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  messageList: {
    padding: 16,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
});
