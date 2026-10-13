# Data Privacy & Retention Policy — LUCKY DRAW (NCSAM 2026)
**School of Cyber Security and Digital Forensics (SCSDF), NFSU Gandhinagar**

---

## 1. Transparency Declaration

The **Lucky Draw** web application is an interactive educational activity designed solely for National Cyber Security Awareness Month (NCSAM) 2026 at SCSDF, NFSU Gandhinagar.

It simulates online phishing techniques, prize draws, and permission requests to demonstrate cybersecurity risks to university students.

---

## 2. Information Collected & Purpose

| Collected Field | Optional / Required | Primary Purpose | Storage Location |
| :--- | :--- | :--- | :--- |
| **Full Name** | Required | Verification of single entry per student | Public Server DB & Local Organizer DB |
| **Phone Number** | Required | Unique student identification & anti-duplicate control | Public Server DB & Local Organizer DB |
| **Course / Program** | Required | Aggregate department participation metrics | Public Server DB & Local Organizer DB |
| **Browser Location (GPS)** | **Optional** | Permission awareness demonstration | Public Server DB & Local Organizer DB |
| **Game Outcome** | Automatic | Wheel result tracking | Public Server DB & Local Organizer DB |
| **Quiz Scores** | Anonymous | Educational outcome assessment | Public Server DB & Local Organizer DB |

---

## 3. Explicit Location Permission Model

1. Location access is **never** requested automatically on page load.
2. The user must click **"Allow Location Access"** explicitly on Page 3.
3. If the user clicks **"Skip and Continue"**, no location coordinates are collected or inferred.
4. Collected location coordinates are rounded to **3 decimal places** (~110m precision) to demonstrate location capture without tracking exact pinpoint coordinates.

---

## 4. 30-Day Mandatory Retention Policy

All identifiable participant records (Name, Phone Number, Course, Location Coordinates) are subject to a strict 30-day retention schedule:

- **Automated Cron Purge**: The public server runs a daily automated maintenance job that identifies and deletes all records created more than 30 days prior.
- **Local Laptop Purge**: The private organizer dashboard provides a manual **"Purge Expired Records"** trigger that purges local SQLite records older than 30 days.
- **Audit Logging**: Completed purges log only aggregate counts and execution timestamps without retaining purged personal identifiers.

---

## 5. Event Organizer Contact

For privacy inquiries, data deletion requests prior to the 30-day window, or event details:

- **Organizer**: Sai Vishwaa N
- **Department**: School of Cyber Security and Digital Forensics (SCSDF)
- **Institution**: National Forensic Sciences University, Gandhinagar, Gujarat, India.
