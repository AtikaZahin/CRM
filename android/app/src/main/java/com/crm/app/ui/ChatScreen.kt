package com.crm.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.crm.app.data.models.ChatMessage
import com.crm.app.network.RetrofitClient
import com.crm.app.repository.CrmRepository
import com.crm.app.ui.components.InputBar
import com.crm.app.ui.components.MessageBubble
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen() {
    val repository = remember { CrmRepository(RetrofitClient.instance) }
    val scope = rememberCoroutineScope()
    var messages by remember { mutableStateOf<List<ChatMessage>>(emptyList()) }

    LaunchedEffect(Unit) {
        messages = repository.getMockMessages()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Chat") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    titleContentColor = MaterialTheme.colorScheme.primary,
                )
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentPadding = PaddingValues(16.dp)
            ) {
                if (messages.isEmpty()) {
                    item {
                        Text(
                            text = "No messages yet",
                            modifier = Modifier.fillMaxWidth(),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                } else {
                    items(messages) { msg ->
                        MessageBubble(message = msg)
                    }
                }
            }

            InputBar(
                onSend = { text ->
                    val newMsg = ChatMessage(
                        id = System.currentTimeMillis().toString(),
                        text = text,
                        isFromUser = true,
                        timestamp = System.currentTimeMillis()
                    )
                    messages = messages + newMsg
                    
                    // Simulate an auto-reply for testing
                    scope.launch {
                        kotlinx.coroutines.delay(1000)
                        val reply = ChatMessage(
                            id = (System.currentTimeMillis() + 1).toString(),
                            text = "Thanks for your message! This is a mock response.",
                            isFromUser = false,
                            timestamp = System.currentTimeMillis()
                        )
                        messages = messages + reply
                    }
                }
            )
        }
    }
}
