# Hospital POS Management System

A comprehensive Point of Sale (POS) system designed specifically for hospital and healthcare facility management. This system provides role-based dashboards for different healthcare professionals and administrative staff.

## 🏥 Features

### Multi-Role Dashboard Support
- **Admin Dashboard**: Complete system management and oversight
- **Doctor Dashboard**: Patient consultations, prescriptions, and medical records
- **Cashier Dashboard**: Payment processing and transaction management
- **Lab Dashboard**: Laboratory test management and results
- **Pharmacy Dashboard**: Medication dispensing and inventory

### Core Functionality
- **Patient Management**: Registration, records, and search functionality
- **Payment Processing**: Secure transaction handling with receipt generation
- **Prescription Management**: Digital prescription creation and tracking
- **Laboratory Services**: Test ordering and result management
- **Pharmacy Integration**: Medication dispensing workflow
- **Reports & Analytics**: Comprehensive reporting system
- **User Management**: Role-based access control

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **SQLite/PostgreSQL** - Database options
- **bcrypt** - Password hashing
- **jsonwebtoken** - Authentication
- **cors** - Cross-origin resource sharing

### Frontend
- **React** - User interface library
- **TypeScript** - Type-safe JavaScript
- **CSS3** - Styling and responsive design
- **Context API** - State management

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (version 14.0 or higher)
- **npm** (comes with Node.js)
- **Git** (for version control)

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/hospital-pos-system.git
cd hospital-pos-system
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Set up the database
node scripts/setup-database.js

# Start the backend server
npm start
```

The backend server will run on `http://localhost:5000`

### 3. Frontend Setup
```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

The frontend application will run on `http://localhost:3000`

## 🔧 Configuration

### Database Configuration
The system supports both SQLite and PostgreSQL databases. Configuration files are located in:
- `backend/config/database-sqlite.js` - SQLite configuration
- `backend/config/database-postgres.js` - PostgreSQL configuration

### Environment Variables
Create a `.env` file in the backend directory:
```env
PORT=5000
JWT_SECRET=your_jwt_secret_here
DB_TYPE=sqlite
# For PostgreSQL:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=hospital_pos
# DB_USER=your_username
# DB_PASSWORD=your_password
```

## 👥 Default User Accounts

After running the database setup, you can log in with these default accounts:

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Doctor | doctor | doctor123 |
| Cashier | cashier | cashier123 |
| Lab | lab | lab123 |
| Pharmacy | pharmacy | pharmacy123 |

⚠️ **Important**: Change these default passwords before deploying to production!

## 🏗️ Project Structure

```
hospital-pos-system/
├── backend/
│   ├── config/          # Database configurations
│   ├── middleware/      # Authentication middleware
│   ├── routes/          # API routes
│   ├── scripts/         # Database setup scripts
│   ├── package.json
│   └── server.js        # Main server file
├── frontend/
│   ├── public/          # Static assets
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── contexts/    # React contexts
│   │   └── ...
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## 📖 Usage Guide

### For Administrators
1. Access the admin dashboard for complete system oversight
2. Manage users, services, and system settings
3. View comprehensive reports and analytics

### For Doctors
1. Register new patients or search existing ones
2. Conduct consultations and create prescriptions
3. Order laboratory tests and pharmacy services

### For Cashiers
1. Process patient payments
2. Handle payment queues
3. Generate receipts and manage transactions

### For Lab Technicians
1. Manage laboratory test orders
2. Update test results
3. Track lab service requests

### For Pharmacy Staff
1. Process prescription orders
2. Manage medication dispensing
3. Update inventory status

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Patients
- `GET /api/patients` - Get all patients
- `POST /api/patients` - Register new patient
- `GET /api/patients/:id` - Get patient by ID

### Transactions
- `GET /api/transactions` - Get all transactions
- `POST /api/transactions` - Create new transaction

### Services
- `GET /api/services` - Get all services
- `POST /api/services` - Create new service

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user

## 🧪 Testing

To run tests (if implemented):
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 🚀 Deployment

### Development
Both frontend and backend run in development mode with hot reloading enabled.

### Production
1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```

2. Configure your production database and environment variables

3. Deploy using your preferred hosting service (Heroku, AWS, DigitalOcean, etc.)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -m 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

If you encounter any issues or have questions:
1. Check the existing issues on GitHub
2. Create a new issue with detailed information
3. Contact the development team

## 🔄 Version History

- **v1.0.0** - Initial release with core POS functionality
- **v1.1.0** - Enhanced doctor portal and prescribed services

## ⚠️ Security Notes

- Always use HTTPS in production
- Regularly update dependencies
- Change default passwords
- Implement proper backup strategies
- Follow healthcare data protection regulations (HIPAA, etc.)

---

**Built with ❤️ for healthcare professionals**