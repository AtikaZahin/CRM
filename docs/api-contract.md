# CRM API Documentation

This backend is built with **FastAPI**, which means the API documentation is automatically generated and kept 100% up-to-date with the code!

Instead of maintaining static Postman or Insomnia collections that go out of date, you can access the live interactive documentation or import the OpenAPI schema directly into your API testing tool of choice.

## 1. Interactive Swagger UI (Recommended)

1. Start the backend server (`uvicorn app.main:app --reload`).
2. Open your browser to: **[http://localhost:8000/docs](http://localhost:8000/docs)**
3. You can execute requests directly from the browser! 
   - To test protected endpoints, click the **Authorize** button at the top right.
   - Use one of the test accounts (e.g. `admin@crm.test` with password `Password@123`) to get a token.
   - The token will be automatically applied to all subsequent requests you make in the Swagger UI.

## 2. ReDoc (Alternative View)

If you prefer a cleaner, more reading-focused documentation view without execution capabilities:
- **[http://localhost:8000/redoc](http://localhost:8000/redoc)**

## 3. Importing into Postman / Insomnia

If you still want to use a desktop API client like Postman or Insomnia:

1. Ensure the backend server is running.
2. In your API client, choose **Import** > **Link**.
3. Paste the URL of the raw OpenAPI JSON:
   - **`http://localhost:8000/openapi.json`**
4. Your client will automatically parse all the routes, query parameters, request bodies, and authentication schemes into a ready-to-use collection!
