package com.crm.app.data.models

data class Lead(
    val id: String,
    val name: String,
    val email: String,
    val status: String
)

data class ChatMessage(
    val id: String,
    val text: String,
    val isFromUser: Boolean,
    val timestamp: Long
)
