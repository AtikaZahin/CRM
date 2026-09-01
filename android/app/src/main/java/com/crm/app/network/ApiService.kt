package com.crm.app.network

import retrofit2.http.GET
import retrofit2.http.POST

interface ApiService {
    @GET("ping")
    suspend fun ping(): String
    
    // Add other endpoints here
}
