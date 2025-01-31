# Hanaco Photography Website

## Overview
A professional photography website featuring photo galleries, e-commerce capabilities, and user management. Built with Node.js and Google Cloud Platform services.

## Tech Stack

### Backend
- **Node.js** with Express.js framework
- **Google Cloud Platform (GCP)**:
  - Cloud Firestore (Native mode)
  - Cloud Storage
  - Cloud Run
  - Cloud Build (CI/CD)

### Frontend
- HTML5
- CSS3
- JavaScript (ES6+)
- Responsive Design

## Project Structure

### API Routes

```plaintext
/api
├── auth/        # Authentication endpoints
├── cart/        # Shopping cart operations
├── favorites/   # User favorites management
├── subscribe/   # Email subscription system
├── orders/      # Order management
├── pages/       # Page management
├── uploads/     # File upload handling
├── users/       # User management
├── box/         # Box display management
└── search/      # Search functionality
```

## Features

### Core Features
- User authentication and authorization
- Shopping cart system
- Photo gallery management
- Order processing
- Email subscription system
- File upload capability
- User profile management

### Database Structure

#### Firestore Collections
- Users
- Orders
- Products
- Subscribers
- Favorites
- Pages
- Boxes

#### Cloud Storage
- Photo uploads
- User uploads
- Website assets

## Setup

### Prerequisites
- Node.js (v14 or higher)
- Google Cloud Platform account
- Firebase project

### Installation

1. Clone the repository
```bash
git clone https://github.com/hanacophoto/hanaco.git
cd hanaco-photography
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
```bash
# Create .env file with the following variables
GCP_PROJECT_ID=your-project-id
GCP_STORAGE_BUCKET=hanacophotography.com
DATABASE_ID=hanacophotography
```

4. Set up Google Cloud credentials
```bash
export GOOGLE_APPLICATION_CREDENTIALS="path/to/your/credentials.json"
```

5. Start the server
```bash
npm start
```

## API Documentation

### Authentication
```plaintext
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/register
```

### Cart Operations
```plaintext
GET /api/cart/user
POST /api/cart/add
POST /api/cart/remove
POST /api/cart/submit-order
```

### Subscription Management
```plaintext
POST /api/subscribe
GET /api/subscribe/all
```

### File Management
```plaintext
POST /api/uploads
GET /api/uploads/folder/:folderName
```

## Data Flow
1. Frontend makes API calls to backend routes
2. Backend interacts with Firestore for data storage
3. Images and files are stored in Google Cloud Storage
4. Authentication state maintained through sessions

## Development

### Running Locally
```bash
# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Directory Structure
```plaintext
.
├── public/           # Static files
├── src/
│   ├── routes/      # API routes
├── test/
└── package.json
```

## License
This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Contact
Project Link: [https://github.com/hanacophoto](https://github.com/hanacophoto)

## Acknowledgments
- Google Cloud Platform
- Express.js
- Node.js community