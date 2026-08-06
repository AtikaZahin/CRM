# CRM API Contract

## 1. Overview
This document defines the API contract for the CRM system. 

## 2. Base URL
`http://api.example.com/v1`

## 3. Authentication
- **Method**: Bearer Token (JWT)
- **Header**: `Authorization: Bearer <token>`

## 4. Core Entities
* **Users** (Internal staff)
* **Customers/Leads**
* **Deals/Opportunities**

## 5. Endpoints

### 5.1 Customers
#### `GET /customers`
Retrieves a list of customers.
- **Response**: `200 OK` (Array of Customer objects)

#### `POST /customers`
Creates a new customer.
- **Request Body**: Customer object
- **Response**: `201 Created`

*(More endpoints to be defined)*
