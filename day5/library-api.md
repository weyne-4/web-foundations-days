# Library Books REST API

## Overview

This API manages books in a library. Each book has an ID, title, author, publication year, and ISBN.

Base path: `/api/books`

## Endpoints

### 1. List all books

* **Method:** GET
* **Path:** `/api/books`
* **Description:** Returns a list of all books in the library.
* **Success status:** `200 OK`

### 2. Get one book

* **Method:** GET
* **Path:** `/api/books/{id}`
* **Description:** Returns the book with the specified ID.
* **Success status:** `200 OK`

Example path: `/api/books/1`

### 3. Create a book

* **Method:** POST
* **Path:** `/api/books`
* **Description:** Creates a new book in the library.
* **Example request body:**

```json
{
  "title": "Introduction to Programming",
  "author": "Jane Doe",
  "publicationYear": 2025,
  "isbn": "9781234567890"
}
```

* **Success status:** `201 Created`

### 4. Update a book

* **Method:** PUT
* **Path:** `/api/books/{id}`
* **Description:** Replaces the details of an existing book.
* **Example request body:**

```json
{
  "title": "Introduction to Programming, Second Edition",
  "author": "Jane Doe",
  "publicationYear": 2026,
  "isbn": "9781234567890"
}
```

* **Success status:** `200 OK`

### 5. Delete a book

* **Method:** DELETE
* **Path:** `/api/books/{id}`
* **Description:** Deletes the book with the specified ID.
* **Success status:** `204 No Content`

### 6. List books by author

* **Method:** GET
* **Path:** `/api/books?author=Jane%20Doe`
* **Description:** Returns books written by the specified author.
* **Success status:** `200 OK`

The `author` query parameter filters the books by author.

## Error Responses

### 400 Bad Request

* **Meaning:** The request contains invalid data or is incorrectly formatted.
* **Example:** A request to create a book is missing the required `title` field.

### 404 Not Found

* **Meaning:** The requested resource does not exist.
* **Example:** A request to `GET /api/books/999` refers to a book that does not exist.
