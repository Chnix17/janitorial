# CleanCheck PH 🏫🧹

**CleanCheck PH** is a web-based school facility and room monitoring system designed for Philippine schools.  
It allows **students** to inspect and report classroom conditions, while **administrators** monitor facility status and **student activity on specific days**.

The system is **user-friendly and fully responsive**, usable on **desktop, tablet, and mobile devices**.

> ⚠️ Important Rules:
> - Only **admins can create user accounts**
> - There is **no user registration** on the login page

---

## 📌 Project Overview

CleanCheck PH focuses on:
- Monitoring classroom and facility conditions
- Tracking student task activity per day
- Ensuring accountability through inspection submissions
- Providing accessible usage across web and mobile devices

Students are assigned rooms on specific dates.  
If a student submits an inspection, they are marked **Active**.  
If no submission is made, they are marked **Inactive** for that day.

---

## 👥 User Roles

### Students
- Log in using admin-created credentials
- View assigned rooms and inspection dates
- Submit daily room inspection reports
- View personal activity status (Active / Inactive)

### Administrators
- Create, update, and deactivate users
- Assign rooms and inspection schedules
- Monitor student activity by date
- View all inspection reports
- Generate summaries and records

---

## 🔐 Authentication

- ❌ No self-registration
- ✅ Admin-only account creation
- ✅ Role-based access control
- Responsive and simple login interface

---

## ✨ Key Features

### 🏫 Facility Monitoring
- Room inspection checklist
- Overall room condition rating
- Inspection history per room

### 👤 Student Activity Monitoring
- Daily room assignments
- Automatic activity status:
  - **Active** – inspection submitted
  - **Inactive** – no submission
- Date-based tracking and reports

### 📱 Responsive & User-Friendly Design
- Mobile-first layout
- Touch-friendly forms and buttons
- Clean and minimal interface
- Consistent experience across devices

---

## 🧾 Inspection Checklist Items

- Lights
- Electric Fans / Air Conditioning
- Chairs and Tables
- Floor Cleanliness
- Trash Bin Status
- Board Condition
- Overall Room Condition
- Comments and Notes
- Optional Photo Upload

---

## 🛠️ Tech Stack

**Frontend**
- HTML
- CSS (Responsive Design)
- JavaScript

**Backend**
- PHP

**Database**
- MySQL

**Development Environment**
- XAMPP / Laragon

---

## 🗄️ Database Structure

### Database Name



---

### `tbluser`
Stores admin and student accounts  
(Admin-created only)

```sql
CREATE TABLE tbluser (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin','student') NOT NULL,
    status ENUM('active','inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE tblbuilding (
    building_id INT AUTO_INCREMENT PRIMARY KEY,
    building_name VARCHAR(100) NOT NULL
);


CREATE TABLE tblroom (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    building_id INT NOT NULL,
    room_number VARCHAR(20) NOT NULL,
    FOREIGN KEY (building_id) REFERENCES tblbuilding(building_id)
);


CREATE TABLE tblassignment (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    room_id INT NOT NULL,
    assigned_date DATE NOT NULL,
    FOREIGN KEY (user_id) REFERENCES tbluser(user_id),
    FOREIGN KEY (room_id) REFERENCES tblroom(room_id)
);


CREATE TABLE tblinspection (
    inspection_id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    overall_condition ENUM('Excellent','Good','Fair','Poor') NOT NULL,
    remarks TEXT,
    FOREIGN KEY (assignment_id) REFERENCES tblassignment(assignment_id)
);


CREATE TABLE tblinspection_details (
    detail_id INT AUTO_INCREMENT PRIMARY KEY,
    inspection_id INT NOT NULL,
    item_name VARCHAR(50) NOT NULL,
    item_status ENUM('ok','not_ok','needs_attention') NOT NULL,
    FOREIGN KEY (inspection_id) REFERENCES tblinspection(inspection_id)
);


CREATE TABLE tblstudent_activity (
    activity_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    activity_date DATE NOT NULL,
    status ENUM('Active','Inactive') NOT NULL,
    FOREIGN KEY (user_id) REFERENCES tbluser(user_id)
);

