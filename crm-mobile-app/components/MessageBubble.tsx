import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MessageBubbleProps {
  text: string;
  isUser: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ text, isUser }) => {
  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.aiContainer]}>
      <Text style={[styles.text, isUser ? styles.userText : styles.aiText]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
  },
  userContainer: {
    alignSelf: 'flex-end',
    backgroundColor: '#0a7ea4',
    borderBottomRightRadius: 4,
  },
  aiContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#e5e5ea',
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  aiText: {
    color: '#000',
  },
});
