# cPanel Migration Guide for Dr. Arman Kabir's Care

## Overview
This guide explains how to migrate the application from Internet Computer (ICP) to cPanel hosting with MySQL/phpMyAdmin.

## File Structure

```
php-api/
├── config.php                 # Database connection config
├── database-schema.sql        # MySQL database schema
├── auth.php                   # Authentication endpoints
├── patient.php                # Patient management endpoints
├── visit.php                  # Visit/clinical records endpoints
├── prescription.php           # Prescription management endpoints
└── .htaccess                  # URL rewriting
```

## Prerequisites

- cPanel hosting account
- PHP 7.4+ with MySQLi support
- MySQL 5.7+ or MariaDB
- phpMyAdmin access
- Git or FTP access

## Step-by-Step Setup

### 1. Database Setup via phpMyAdmin

1. Log into your cPanel
2. Navigate to **phpMyAdmin**
3. Create a new database:
   - Database name: `your_cpanel_username_drakabir`
   - Collation: `utf8mb4_unicode_ci`
4. Create a database user:
   - Username: `your_cpanel_username_drakabir_user`
   - Password: Generate a strong password
5. Assign all privileges to the user
6. Import the schema:
   - Click on your database
   - Go to **Import** tab
   - Upload `database-schema.sql`
   - Click **Import**

### 2. Update Configuration

1. Edit `php-api/config.php`:
   ```php
   $db_host = 'localhost';
   $db_user = 'your_cpanel_username_drakabir_user';
   $db_pass = 'your_actual_password';
   $db_name = 'your_cpanel_username_drakabir';
   ```

2. Update JWT secret key (change from default):
   ```php
   $secret = 'your-unique-secret-key-here-change-this';
   ```

### 3. Upload PHP API Files

1. Via **File Manager** or **FTP**:
   - Connect to your cPanel
   - Navigate to `public_html/`
   - Create folder: `public_html/api/`
   - Upload all PHP files from `php-api/`
   - Upload `.htaccess`

2. Set permissions:
   - PHP files: 644
   - Directories: 755
   - config.php: 600 (read-only)

### 4. Build and Upload React Frontend

1. Build the React app:
   ```bash
   cd src/frontend
   npm install
   npm run build
   ```

2. Upload built files:
   - Copy contents of `src/frontend/dist/`
   - Upload to `public_html/`
   - Ensure `index.html` is in root

### 5. Configure Frontend API Connection

1. Create `public_html/config.js`:
   ```javascript
   const API_BASE_URL = 'https://yourdomain.com/api';
   ```

2. Update React API service (`src/frontend/src/services/api.ts`):
   ```typescript
   import axios from 'axios';
   
   const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://yourdomain.com/api';
   
   export const apiClient = axios.create({
     baseURL: API_BASE_URL,
     headers: {
       'Content-Type': 'application/json'
     }
   });
   
   export const setAuthToken = (token) => {
     if (token) {
       apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
     }
   };
   ```

### 6. API Endpoints Reference

#### Authentication

**Register**
```
POST /api/auth.php?action=register
Body: {
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "role": "patient"
}
```

**Login**
```
POST /api/auth.php?action=login
Body: {
  "email": "user@example.com",
  "password": "password123"
}
Response: { "token": "jwt_token_here" }
```

**Get Current User**
```
GET /api/auth.php?action=current-user
Headers: { "Authorization": "Bearer token_here" }
```

#### Patients

**List All Patients**
```
GET /api/patient.php?action=list
```

**Get Patient by ID**
```
GET /api/patient.php?action=get&id=1
```

**Create Patient**
```
POST /api/patient.php?action=create
Body: {
  "user_id": 1,
  "full_name": "Ahmed Khan",
  "gender": "male",
  "date_of_birth": "1990-05-15",
  "blood_group": "O+",
  "allergies": ["Penicillin"],
  "chronic_conditions": ["Diabetes"],
  "patient_type": "outdoor"
}
```

**Update Patient**
```
PUT /api/patient.php?action=update
Body: {
  "id": 1,
  "full_name": "Ahmed Khan Updated",
  "weight": 75.5
}
```

**Delete Patient**
```
DELETE /api/patient.php?action=delete&id=1
```

**Sync Patients (since timestamp)**
```
GET /api/patient.php?action=sync&since=1234567890
```

#### Visits/Clinical Records

**List All Visits**
```
GET /api/visit.php?action=list
```

**Get Visits by Patient**
```
GET /api/visit.php?action=by-patient&patient_id=1
```

**Create Visit**
```
POST /api/visit.php?action=create
Body: {
  "patient_id": 1,
  "visit_date": "2024-01-15 10:30:00",
  "chief_complaint": "Fever and cough",
  "blood_pressure": "120/80",
  "pulse": "72",
  "temperature": "99.5",
  "diagnosis": "Common cold",
  "visit_type": "outdoor"
}
```

**Update Visit**
```
PUT /api/visit.php?action=update
Body: {
  "id": 1,
  "diagnosis": "Severe cold",
  "notes": "Updated diagnosis"
}
```

**Delete Visit**
```
DELETE /api/visit.php?action=delete&id=1
```

#### Prescriptions

**List All Prescriptions**
```
GET /api/prescription.php?action=list
```

**Get Prescriptions by Patient**
```
GET /api/prescription.php?action=by-patient&patient_id=1
```

**Create Prescription**
```
POST /api/prescription.php?action=create
Body: {
  "patient_id": 1,
  "visit_id": 1,
  "diagnosis": "Common cold",
  "medications": [
    {
      "name": "Paracetamol",
      "dose": "500mg",
      "frequency": "3 times daily",
      "duration": "5 days",
      "instructions": "After meals"
    }
  ],
  "notes": "Rest and drink fluids"
}
```

**Update Prescription**
```
PUT /api/prescription.php?action=update
Body: {
  "id": 1,
  "medications": [...],
  "notes": "Updated instructions"
}
```

**Delete Prescription**
```
DELETE /api/prescription.php?action=delete&id=1
```

### 7. SSL/HTTPS Setup

1. In cPanel, go to **SSL/TLS**
2. Install free AutoSSL certificate
3. Force HTTPS:
   - Create `.htaccess` in `public_html/`:
   ```apache
   <IfModule mod_ssl.c>
       RewriteEngine On
       RewriteCond %{HTTPS} off
       RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
   </IfModule>
   ```

### 8. Testing

1. Test authentication:
   ```bash
   curl -X POST https://yourdomain.com/api/auth.php?action=register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "test123",
       "full_name": "Test User"
     }'
   ```

2. Test patient creation:
   ```bash
   curl -X POST https://yourdomain.com/api/patient.php?action=create \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": 1,
       "full_name": "Patient Name",
       "gender": "male"
     }'
   ```

### 9. Backup Strategy

1. Database backups (via phpMyAdmin):
   - Export database regularly
   - Store in secure location

2. File backups (via cPanel):
   - Use **Backups** section
   - Schedule automatic backups

### 10. Monitoring & Maintenance

1. Check error logs:
   - cPanel → **Error Log**
   - Review `/public_html/api/` logs

2. Monitor database:
   - phpMyAdmin → Check table sizes
   - Optimize tables periodically

3. Security:
   - Update JWT secret periodically
   - Implement rate limiting
   - Monitor suspicious activities

## Common Issues

### 404 Errors on API calls
- Verify `.htaccess` is in `public_html/api/`
- Check if `mod_rewrite` is enabled in cPanel

### Database connection errors
- Verify credentials in `config.php`
- Check user privileges in phpMyAdmin
- Ensure database exists

### CORS errors
- Verify CORS headers in `config.php`
- Check `.htaccess` CORS configuration

### Authentication failures
- Verify JWT secret key
- Check token expiration (24 hours)
- Ensure Authorization header format is correct

## Production Checklist

- [ ] Change default JWT secret
- [ ] Set proper file permissions (600 for config)
- [ ] Enable HTTPS/SSL certificate
- [ ] Implement rate limiting
- [ ] Setup database backups
- [ ] Configure error logging
- [ ] Test all API endpoints
- [ ] Monitor performance
- [ ] Setup uptime monitoring
- [ ] Document API for team

## Support

For issues or questions:
1. Check cPanel error logs
2. Review API response messages
3. Verify database data via phpMyAdmin
4. Test API endpoints with curl or Postman

