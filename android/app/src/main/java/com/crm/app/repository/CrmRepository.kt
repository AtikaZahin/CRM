package com.crm.app.repository

import com.crm.app.data.models.ChatMessage
import com.crm.app.network.ApiService

class CrmRepository(private val apiService: ApiService) {

    suspend fun getMockMessages(): List<ChatMessage> {
        // Hardcoded responses for Task 4.10
        return listOf(
            ChatMessage("1", "Hello! I am looking for a new CRM solution.", false, System.currentTimeMillis() - 100000),
            ChatMessage("2", "Hi! I'd be happy to help. What features are you looking for?", true, System.currentTimeMillis() - 50000),
            ChatMessage("3", "Mainly lead tracking and automated follow-ups.", false, System.currentTimeMillis())
        )
    }
}
