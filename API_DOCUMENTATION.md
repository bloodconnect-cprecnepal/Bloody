# API Documentation

## Endpoint Specifications

### 1. User Authentication
- **POST /api/auth/login**  
**Request Format:**  
```json
{
  "username": "string",
  "password": "string"
}
```
**Response Format:**  
- **200 OK**  
```json
{
  "token": "string",
  "userId": "string"
}
```
- **401 Unauthorized**  
```json
{
  "error": "Invalid credentials"
}
```

### 2. Retrieve Blood Donors
- **GET /api/donors**  
**Request Format:**   
- No request body  
**Response Format:**  
- **200 OK**  
```json
[
  {
    "id": "string",
    "name": "string",
    "bloodType": "string"
  }
]
```
- **404 Not Found**  
```json
{
  "error": "No donors found"
}
```

## Error Codes
- **400** - Bad Request  
- **401** - Unauthorized  
- **403** - Forbidden  
- **404** - Not Found  
- **500** - Internal Server Error

## Rate Limiting
- Limit: 100 requests per hour per IP
- Response header: `X-RateLimit-Limit` and `X-RateLimit-Remaining`

## Authentication Flow
1. User sends a POST request to `/api/auth/login` with credentials.
2. On success, the server responds with a token that must be included in subsequent requests as a bearer token in the `Authorization` header.

Example:  
`Authorization: Bearer <token>`

---