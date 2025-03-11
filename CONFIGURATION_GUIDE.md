# Dynamic Configuration System Guide

This guide explains how to use the dynamic configuration system in the Car Cleaning Service application. This system allows administrators to modify application settings without changing code.

## Overview

The application uses a database-driven configuration system that allows administrators to:

1. Change service pricing
2. Modify business hours
3. Adjust booking restrictions
4. Configure system behavior

All configurations are stored in MongoDB and can be modified through the admin interface.

## Configuration Categories

Configurations are organized into the following categories:

### Pricing

Control all pricing aspects of the application:

| Key | Description | Default | Type |
|-----|-------------|---------|------|
| `pricing.oneTimeCleaning` | Price for one-time cleaning (Baht) | 100 | Number |
| `pricing.weeklySubscription` | Price for once-a-week subscription (Baht/month) | 300 | Number |
| `pricing.premiumSubscription` | Price for thrice-a-week subscription (Baht/month) | 500 | Number |

### Scheduling

Control business hours and time slot settings:

| Key | Description | Default | Type |
|-----|-------------|---------|------|
| `scheduling.businessHours` | Business hours for cleaning services | `{ start: '09:00', end: '21:00' }` | Object |
| `scheduling.saturdayCutoffHour` | Hour after which Saturday bookings are blocked (24h format) | 18 | Number |
| `scheduling.minBookingHoursAhead` | Minimum hours ahead required for a booking | 6 | Number |
| `scheduling.slotDuration` | Duration of each time slot in minutes | 30 | Number |
| `scheduling.sundayBookings` | Whether bookings are allowed on Sundays | false | Boolean |

### Booking

Control general booking behavior:

| Key | Description | Default | Type |
|-----|-------------|---------|------|
| `booking.subscriptionRenewalReminderDays` | Days before subscription end to send renewal reminder | 5 | Number |

### System

Control system-wide settings:

| Key | Description | Default | Type |
|-----|-------------|---------|------|
| `system.emailVerificationRequired` | Whether email verification is required for new accounts | true | Boolean |
| `system.otpExpiryMinutes` | OTP expiry time in minutes | 10 | Number |
| `system.otpRateLimitMinutes` | Rate limit for OTP requests in minutes | 1 | Number |

## How to Modify Configurations

### Using Admin Dashboard (Recommended)

1. Log in as an administrator
2. Navigate to **Settings** → **Configurations**
3. Browse configurations by category or search for a specific key
4. Click on a configuration to edit its value
5. Save changes

### Using API Directly

The following API endpoints are available for configuration management:

- `GET /api/admin/configurations` - Get all configurations
- `GET /api/admin/configurations?category=pricing` - Get configurations by category
- `GET /api/admin/configurations/:key` - Get specific configuration
- `PUT /api/admin/configurations/:key` - Update configuration
- `POST /api/admin/configurations/reset` - Reset all configurations to default values

Example of updating a configuration:

```bash
# Update one-time cleaning price to 120 Baht
curl -X PUT http://localhost:5000/api/admin/configurations/pricing.oneTimeCleaning \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": 120}'
```

## Technical Implementation

Configurations are stored in MongoDB with the following schema:

```typescript
{
  key: string;       // Unique identifier (e.g., "pricing.oneTimeCleaning") 
  value: any;        // The actual value (type depends on the configuration)
  type: string;      // Data type: 'string', 'number', 'boolean', 'object', 'array'
  description: string; // Human-readable description
  category: string;  // Category: 'pricing', 'scheduling', 'booking', 'system'
  updatedBy?: ObjectId; // User who last modified this setting
  createdAt: Date;   // When setting was created
  updatedAt: Date;   // When setting was last modified
}
```

## Initialization and Defaults

The application automatically initializes default configurations on first startup. If a configuration is missing when requested, the system will return a predefined default value, ensuring the application always has valid settings.

Default configurations are defined in `backend/src/utils/configService.ts` and can be seeded using:

```bash
npm run seed
```

## Extending Configurations

To add new configurations:

1. Add the new configuration to the `defaultConfigs` array in `backend/src/utils/configService.ts`
2. Update any services that need to use the new configuration
3. Restart the application or run the seed command

## Best Practices

1. Always validate input when updating configurations
2. Use the appropriate data type for each configuration
3. Create helper methods for accessing complex configuration objects
4. Add proper descriptions for each configuration to help administrators understand their purpose 