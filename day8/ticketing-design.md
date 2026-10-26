# TicketHub: System Design

## 1. Overview

TicketHub is an online ticketing platform where users discover concerts and events, view available seats, reserve tickets, and complete purchases.

The main system design challenge is handling unpredictable traffic during popular ticket sales while ensuring that each seat is sold to no more than one customer.

The design uses a virtual waiting room, multiple application servers, a relational database, caching, and background workers. The primary database remains the authoritative source of seat availability and booking status.

## 2. Requirements

### 2.1 Functional Requirements

TicketHub must allow users to:

1. Register, sign in, and manage their accounts.
2. Browse concerts and other events.
3. View event details, venues, dates, prices, and seat maps.
4. View the current availability of seats.
5. Enter a virtual waiting room during high-demand ticket sales.
6. Select and reserve available seats temporarily.
7. Pay for a reservation through a payment provider.
8. Receive order confirmation and electronic tickets after successful payment.
9. View their reservations, orders, and tickets.
10. Cancel eligible reservations and release their seat holds.
11. Expire unpaid reservations automatically.
12. Receive notifications about purchases and important booking events.

Administrators should be able to create events, configure prices, publish seat inventories, and monitor sales.

### 2.2 Non-Functional Requirements

**Scalability:** The platform must handle normal traffic and substantial increases in demand when popular concerts go on sale.

**Availability:** The failure of a single application server should not make the entire service unavailable.

**Performance:** Event listings and seat maps should load quickly under normal operating conditions.

**Consistency:** A seat must never be confirmed as sold to two different customers.

**Security:** User accounts, personal information, payment interactions, and tickets must be protected against unauthorized access.

**Reliability:** Reservations, payments, and ticket issuance must be recorded consistently, with recoverable handling of failures.

**Fairness:** The waiting room should control admission fairly and reduce advantages gained through excessive requests or automated traffic.

**Maintainability:** The system should separate browsing, inventory management, booking, payment processing, and background tasks into clearly defined components.

**Observability:** Logs, metrics, and alerts should reveal errors, overloaded services, slow requests, and failed background jobs.

## 3. Traffic and Capacity Estimates

The estimates below use the figures provided in the assignment. Average rates are useful for planning, but actual traffic can arrive in much shorter bursts.

### 3.1 Normal Daily Traffic

TicketHub has:

* 2 million registered users.
* 50,000 visitors on a normal day.
* 10 page views per visitor.
* 5,000 tickets sold on a normal day.

#### Daily page views

Daily page views = Daily visitors × Pages viewed per visitor

50,000 × 10 = **500,000 page views per day**

#### Average page views per second

500,000 ÷ 86,400 seconds = approximately **5.79 page views per second**.

This is the average rate of page views across the entire day. Actual API requests will depend on how many requests each page makes, and peak traffic may be considerably higher.

#### Average ticket sales rate

5,000 tickets ÷ 86,400 seconds = approximately **0.058 tickets per second**.

That is approximately 3.47 tickets per minute when averaged across the day. Sales will not necessarily be evenly distributed because purchases often cluster around particular events and sale times.

### 3.2 Popular Concert Sale

For a popular concert:

* 200,000 people attempt to buy tickets.
* The concert has 20,000 seats.
* The attempts occur within the first 10 minutes.

Ten minutes = 600 seconds.

#### Average purchase attempts per second

200,000 ÷ 600 = approximately **333.33 attempts per second**.

TicketHub should therefore plan for an average of approximately **333 purchase attempts per second during this sale period**, while recognizing that short bursts can exceed this average.

#### Demand compared with available seats

200,000 interested people ÷ 20,000 available seats = **10 people per seat**.

There are ten times as many interested people as available seats. Even if every seat is sold, most of these people cannot obtain a ticket for this concert.

#### Maximum average seat-sale rate

20,000 seats ÷ 600 seconds = approximately **33.33 seats per second**.

This is the average rate needed to sell all 20,000 seats evenly throughout the ten-minute period. It is not a guarantee that sales will be evenly distributed.

### 3.3 Capacity Planning Strategy

TicketHub should not send all 200,000 users directly to the booking database at the same time.

The proposed design will:

1. Serve static pages and assets through a content delivery network.
2. Place high-demand sales behind a virtual waiting room.
3. Admit users to the booking service at a controlled rate.
4. Apply rate limits to reduce abusive requests and automated retries.
5. Cache event information and suitable read-only data.
6. Perform seat reservation and purchase confirmation through transactional database operations.
7. Scale application servers according to observed traffic.
8. Use load tests with realistic bursts to establish safe admission rates and infrastructure capacity.

As an initial engineering exercise, testing at twice the estimated average of 333 attempts per second would mean testing approximately **667 admission attempts per second**. This is a proposed test target, not a measured system capacity or a figure supplied by the assignment. The final admission rate must be established through load testing.

A large waiting-room population should remain in the waiting-room system rather than being represented by an equivalent number of concurrent application-server requests.

## 4. API Design

The API uses REST-style HTTP endpoints and JSON request and response bodies. Authenticated users can perform operations only on resources they are authorized to access.

| Method | Endpoint                                     | Purpose                                                      | Success status   |
| ------ | -------------------------------------------- | ------------------------------------------------------------ | ---------------- |
| GET    | `/api/events`                                | List published events, with optional filters and pagination. | `200 OK`         |
| GET    | `/api/events/{eventId}`                      | Retrieve details about a specific event.                     | `200 OK`         |
| GET    | `/api/events/{eventId}/seats`                | Retrieve a seat map and displayed availability.              | `200 OK`         |
| POST   | `/api/events/{eventId}/reservations`         | Temporarily reserve selected seats.                          | `201 Created`    |
| GET    | `/api/reservations/{reservationId}`          | Retrieve the status of a reservation.                        | `200 OK`         |
| POST   | `/api/reservations/{reservationId}/payments` | Initiate payment for an active reservation.                  | `201 Created`    |
| POST   | `/api/payment-webhooks/{provider}`           | Receive and process payment-provider notifications.          | `200 OK`         |
| GET    | `/api/orders/{orderId}`                      | Retrieve a completed order and its tickets.                  | `200 OK`         |
| DELETE | `/api/reservations/{reservationId}`          | Cancel an eligible reservation and release its seat holds.   | `204 No Content` |

The payment webhook must verify the provider's signature and process repeated notifications idempotently. It must not trust an arbitrary client message claiming that payment succeeded.

### 4.1 Reserve Seats

Example request:

```http
POST /api/events/42/reservations
Authorization: Bearer <access-token>
Content-Type: application/json
Idempotency-Key: 41c8f2d0-2026-10-26
```

```json
{
  "seat_ids": [501, 502]
}
```

The server checks availability and attempts to reserve both seats in a database transaction.

An illustrative successful response is:

```json
{
  "reservation_id": 7001,
  "event_id": 42,
  "status": "held",
  "seat_ids": [501, 502],
  "expires_at": "2026-10-26T14:05:00Z"
}
```

The example uses a temporary hold that expires five minutes after creation. The actual hold duration is a design choice that should be adjusted to the payment flow and observed abandonment rate.

If one of the requested seats is no longer available, the server returns `409 Conflict` and does not partially reserve the requested seats.

The `Idempotency-Key` allows a repeated request to return the result of its original operation instead of creating another reservation.

### 4.2 Initiate Payment

Example request:

```http
POST /api/reservations/7001/payments
Authorization: Bearer <access-token>
Content-Type: application/json
Idempotency-Key: payment-7001-attempt-1
```

```json
{
  "payment_method": "provider_checkout"
}
```

The server verifies that the reservation belongs to the user, is still active, and contains seats held for that reservation. It then initiates payment with the payment provider.

The client returning from a checkout page is not sufficient proof of successful payment. TicketHub must verify the payment with the provider or through a verified provider notification.

### 4.3 Error Responses

The API should use consistent error responses. Examples include:

* `400 Bad Request` — invalid request data.
* `401 Unauthorized` — missing or invalid authentication.
* `403 Forbidden` — insufficient permission.
* `404 Not Found` — requested resource does not exist or is not accessible.
* `409 Conflict` — a seat is unavailable or a reservation has expired.
* `429 Too Many Requests` — the user has exceeded a request limit.
* `500 Internal Server Error` — unexpected server failure.
* `503 Service Unavailable` — a required service cannot safely accept the request.

An example response for a seat conflict is:

```json
{
  "error": {
    "code": "SEAT_UNAVAILABLE",
    "message": "One or more selected seats are no longer available."
  }
}
```

Error responses must not expose internal stack traces, payment credentials, or other sensitive implementation details.

## 5. Data Model

TicketHub uses a relational database because ticket bookings need strong consistency, transactions, uniqueness constraints, and relationships between users, events, seats, and payments.

The proposed model contains the following tables:

1. `users`
2. `venues`
3. `events`
4. `seats`
5. `reservations`
6. `event_seats`
7. `orders`
8. `tickets`
9. `payments`

### 5.1 Users

Stores registered customers.

Important columns:

* `id` — primary key.
* `email` — unique email address.
* `created_at` — account creation timestamp.

One user can create many reservations and orders.

### 5.2 Venues

Stores the places where events take place.

Important columns:

* `id` — primary key.
* `name` — venue name.
* `location` — venue location.
* `timezone` — venue time zone.

One venue can host many events and contains a defined seating layout.

### 5.3 Events

Stores concerts and other events.

Important columns:

* `id` — primary key.
* `venue_id` — foreign key referencing `venues.id`.
* `title` — event name.
* `starts_at` — event start time.
* `sale_starts_at` — ticket sale opening time.
* `status` — event publication and sale status.

One venue can host many events. Each event belongs to one venue.

### 5.4 Seats

Stores the physical seating layout for venues.

Important columns:

* `id` — primary key.
* `venue_id` — foreign key referencing `venues.id`.
* `section` — seating section.
* `row_label` — row identifier.
* `seat_number` — seat number.

The combination of venue, section, row, and seat number should be unique.

### 5.5 Reservations

Stores temporary seat holds and their status.

Important columns:

* `id` — primary key.
* `user_id` — foreign key referencing `users.id`.
* `event_id` — foreign key referencing `events.id`.
* `status` — held, confirmed, expired, or cancelled.
* `expires_at` — hold expiration time.
* `idempotency_key` — protects against duplicate reservation requests.
* `created_at` — reservation creation time.

One user can create many reservations, and one reservation can contain multiple seats for a single event.

### 5.6 Event_Seats

Tracks the availability of each physical seat for a particular event.

Important columns:

* `id` — primary key.
* `event_id` — foreign key referencing `events.id`.
* `seat_id` — foreign key referencing `seats.id`.
* `status` — available, reserved, or sold.
* `reservation_id` — nullable foreign key referencing the active reservation.
* `hold_expires_at` — expiration time for a temporary hold.

The combination of `event_id` and `seat_id` must be unique. This ensures that there is only one inventory record for a physical seat at a particular event.

This table is the authoritative record for seat availability. A cache or seat map must not be treated as proof that a seat can be purchased.

### 5.7 Orders

Stores completed or pending purchase records.

Important columns:

* `id` — primary key.
* `user_id` — foreign key referencing `users.id`.
* `reservation_id` — unique foreign key referencing `reservations.id`.
* `status` — pending, paid, or cancelled.
* `total_amount` — total order price.
* `currency` — currency code.
* `created_at` — order creation time.

A reservation can produce at most one order under this initial model.

### 5.8 Tickets

Stores issued tickets.

Important columns:

* `id` — primary key.
* `order_id` — foreign key referencing `orders.id`.
* `event_seat_id` — unique foreign key referencing `event_seats.id`.
* `ticket_code` — unique ticket identifier.
* `issued_at` — ticket issue timestamp.

The unique constraint on `event_seat_id` prevents the application from issuing two tickets for the same event seat.

### 5.9 Payments

Stores payment attempts and provider references.

Important columns:

* `id` — primary key.
* `order_id` — foreign key referencing `orders.id`.
* `provider_reference` — unique payment-provider reference.
* `amount` — payment amount.
* `currency` — currency code.
* `status` — pending, succeeded, failed, or refunded.
* `created_at` — payment creation time.

A verified provider reference and idempotent payment processing help prevent duplicate handling of payment notifications.

### 5.10 Relationships

The major relationships are:

* **Users → Reservations:** one-to-many.
* **Users → Orders:** one-to-many.
* **Venues → Events:** one-to-many.
* **Venues → Seats:** one-to-many.
* **Events → Event_Seats:** one-to-many.
* **Seats → Event_Seats:** one-to-many across different events.
* **Reservations → Event_Seats:** one-to-many for seats held by a reservation.
* **Reservations → Orders:** one-to-zero-or-one in the proposed model.
* **Orders → Tickets:** one-to-many.
* **Event_Seats → Tickets:** one-to-zero-or-one, enforced by the unique `event_seat_id`.
* **Orders → Payments:** one-to-many, allowing multiple payment attempts to be recorded.

The schema separates physical seats from event-specific seat inventory. A seat at a venue can be used for different events, but each event has its own availability record.

## 6. Architecture

### 6.1 High-Level Architecture Diagram

```text
                    +----------------------+
                    |   Web / Mobile       |
                    |       Clients        |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |         DNS          |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |   CDN and WAF        |
                    | Static assets,       |
                    | filtering, rate limit|
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    | Virtual Waiting Room |
                    | Admission tokens     |
                    | Sale traffic control |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |  Redundant Load      |
                    |     Balancer         |
                    +----------+-----------+
                               |
                   +-----------+-----------+
                   |                       |
                   v                       v
          +----------------+      +----------------+
          | Application A  |      | Application B  |
          | API / Booking  |      | API / Booking  |
          +-------+--------+      +--------+-------+
                  |                        |
                  +------------+-----------+
                               |
                  +------------+------------+
                  |                         |
                  v                         v
         +------------------+     +---------------------+
         | Cache Cluster    |     | Primary Relational  |
         | Event details    |     | Database            |
         | Non-authoritative|     | Seat transactions   |
         +------------------+     +----------+----------+
                                             |
                                       Replication
                                             |
                                             v
                                  +---------------------+
                                  | Read Replica        |
                                  | Suitable read loads |
                                  +---------------------+

             Application services
                       |
                       v
              +------------------+
              | Durable Job Queue|
              +--------+---------+
                       |
                       v
              +------------------+
              | Worker Pool      |
              | Email, expiry,   |
              | notifications    |
              +------------------+

              Application services
                       |
                       v
              +------------------+
              | Payment Provider |
              +------------------+
                       |
                 Signed webhook
                       |
                       v
              TicketHub API
```

### 6.2 Component Explanations

**Web and mobile clients:** Provide the interface for browsing events, choosing seats, reserving tickets, and completing checkout.

**DNS:** Resolves the TicketHub domain to the appropriate service entry point.

**CDN:** Serves static website assets from distributed locations, reducing latency and load on the application servers.

**Web Application Firewall (WAF):** Filters suspicious requests and helps protect the service from common web attacks.

**Rate limiting:** Restricts excessive requests from a user, token, or other defined identity to help prevent abuse and overload.

**Virtual waiting room:** Places users in a controlled queue during popular sales and admits them at a rate the booking system can safely support.

**Load balancer:** Distributes admitted API traffic across healthy application instances.

**Application servers:** Validate requests, authenticate users, coordinate reservations, enforce business rules, and communicate with the database, queue, and payment provider.

**Cache cluster:** Stores suitable event descriptions and read-heavy data so repeated requests do not always reach the database. Cached seat availability is only indicative; the primary database decides whether a seat can actually be reserved.

**Primary relational database:** Stores authoritative reservation and seat state and performs transactions that prevent conflicting bookings.

**Read replica:** Offloads suitable read-heavy queries from the primary database. It may have replication lag, so it must not be trusted to authorize a seat reservation.

**Durable job queue:** Holds asynchronous tasks so notifications and other non-critical operations do not delay the purchase transaction.

**Worker pool:** Processes queued tasks, including confirmation emails, reservation-expiration cleanup, and other background work.

**Payment provider:** Processes payments and sends signed notifications about payment outcomes. TicketHub verifies these outcomes before issuing tickets.

**Monitoring and logging:** Collects application errors, latency, queue depth, database performance, and booking-conflict metrics to help operators detect and resolve failures.

### 6.3 Preventing Double Booking

Preventing double booking is a core business requirement. The browser, cache, and waiting room must not be responsible for deciding whether a seat has been sold.

TicketHub uses the following protections.

#### 1. One authoritative inventory row per event seat

The database enforces a unique constraint on:

`UNIQUE(event_id, seat_id)`

Only one inventory row can represent a particular physical seat at a particular event.

#### 2. Atomic seat reservation

When a customer selects seats, the backend starts a database transaction. For PostgreSQL, the service can lock the requested inventory rows using `SELECT ... FOR UPDATE` and process them in a consistent order.

The service verifies that all requested seats are available. It then creates a reservation and changes the selected inventory rows from `available` to `reserved`, associating them with the new reservation and its expiration time.

An alternative protection is an atomic conditional update:

```sql
UPDATE event_seats
SET
    status = 'reserved',
    reservation_id = :reservation_id,
    hold_expires_at = :expires_at
WHERE event_id = :event_id
  AND seat_id = :seat_id
  AND status = 'available';
```

The application must verify that exactly one row was updated for every requested seat. If any seat could not be reserved, the transaction rolls back, so the user does not receive a partial reservation unless the API explicitly supports partial booking.

The row locks, conditional status check, and transaction ensure that two simultaneous requests cannot both successfully reserve the same available row.

#### 3. Temporary holds

A seat is held for a limited period, such as five minutes.

While held, it cannot be reserved by another customer. If the reservation expires or is cancelled before purchase, a transaction releases the seat only if it is still held by that particular reservation.

An expiration worker must not blindly mark a seat available. It must check the reservation identifier and current state so that it cannot accidentally release a seat already sold or re-reserved.

#### 4. Confirming payment and issuing tickets

After payment is verified, TicketHub uses a transaction to:

1. Lock the reservation and relevant seat rows.
2. Verify that the reservation remains valid.
3. Verify that the seats are still held for that reservation.
4. Record the order and successful payment state.
5. Change the event seats to `sold`.
6. Create the tickets.
7. Mark the reservation as confirmed.
8. Commit the transaction.

The unique constraint on `tickets.event_seat_id` adds another safeguard against issuing duplicate tickets for one event seat.

If any critical database operation fails, the transaction rolls back.

#### 5. Handling payment races and retries

Payment-provider calls should not be made while holding database row locks or an open transaction.

TicketHub should use idempotency keys for client purchase requests and provider payment operations. Verified payment callbacks must be processed idempotently because providers can send the same notification more than once.

If a payment succeeds after a reservation expires, the system must not simply issue a ticket for a seat that has become available or been sold to another customer. It must follow a defined recovery policy, such as retrying a safe state transition or refunding the payment.

**Result:** The waiting room reduces overload, while database transactions, locking, conditional updates, uniqueness constraints, and idempotent payment processing enforce the actual no-double-booking guarantee.

## 7. Request Flows

### 7.1 Browsing Events and Seats

1. The client requests the list of events.
2. DNS resolves the TicketHub domain.
3. The CDN serves cached static assets where possible.
4. The load balancer routes API traffic to a healthy application server.
5. The application retrieves event details from the cache when suitable.
6. If the cache misses, the application reads from the database or an appropriate read replica.
7. The application returns event information to the client.
8. The client displays the event and available seats.

Seat availability in this response is informational. A seat can become unavailable before the customer clicks the reserve button, so the reserve operation must always validate the latest database state.

### 7.2 Reserving Seats

1. The user selects seats and requests a reservation.
2. The waiting room validates admission when the sale is under traffic control.
3. A healthy application server receives the request.
4. The backend authenticates the user and validates the event and requested seat identifiers.
5. The backend starts a database transaction and locks or conditionally updates the inventory rows.
6. It verifies that every requested seat is available.
7. It creates the reservation and atomically holds all selected seats.
8. The database transaction commits.
9. The backend returns the reservation identifier and expiration time.
10. If a seat is unavailable, the transaction rolls back and the API returns a conflict response.

### 7.3 Completing a Purchase

1. The customer initiates checkout for an active reservation.
2. TicketHub verifies the reservation and starts the payment process.
3. The payment provider processes the payment without TicketHub holding database locks open during the external call.
4. The provider returns a verified result or sends a signed webhook.
5. TicketHub verifies the payment reference and processes the result idempotently.
6. The booking service locks the reservation and checks that its seats are still held for that reservation.
7. A database transaction records the paid order, marks the inventory as sold, and creates one ticket per seat.
8. The transaction commits, and the reservation becomes confirmed.
9. The backend responds with the order status.
10. A background worker sends the confirmation email and delivers ticket details.

If payment fails, the user can retry while the reservation is valid. If the hold expires, the system releases its seats safely and does not issue tickets without a valid confirmed sale.

## 8. Trade-Offs

### 8.1 Strong Database Consistency vs. Maximum Throughput

**Choice:** Use transactional seat reservations with row locking, conditional updates, and database constraints.

**Advantages:**

* Prevents competing bookings for the same seat.
* Maintains a clear authoritative inventory state.
* Enables atomic reservation and ticket-issuance operations.

**Disadvantages:**

* Concurrent requests for the same seats must wait or fail.
* Row locking and transactions can increase latency.
* The primary database can become a bottleneck during major sales.

**Decision:** Correctness is more important than accepting every purchase attempt. Cache reads, control admission rates, keep transactions short, and scale the database carefully. Do not weaken seat consistency merely to increase request throughput.

### 8.2 Caching vs. Up-to-Date Seat Availability

**Choice:** Cache event descriptions and suitable read-heavy information, but treat the primary database as authoritative for seat reservations.

**Advantages:**

* Reduces repeated database reads.
* Improves page-response times.
* Supports large numbers of event-page visitors.

**Disadvantages:**

* A cached seat map can become stale.
* Cache invalidation adds complexity.
* Cache failure may increase primary-database load.

**Decision:** Make the reserve endpoint perform an authoritative database check. A stale seat map may briefly show a seat as available, but the booking transaction must reject it if another customer has already reserved it.

### 8.3 Virtual Waiting Room vs. Immediate Access

**Choice:** Use a virtual waiting room during exceptionally popular ticket sales.

**Advantages:**

* Prevents all interested users from overwhelming the booking system at once.
* Supports controlled admission and better operational stability.
* Reduces pressure on database connections and transaction locks.

**Disadvantages:**

* Customers must wait before attempting a purchase.
* Queue systems introduce complexity and potential fairness concerns.
* Admission control can become a bottleneck if designed as a single failure point.

**Decision:** Use an independently scalable, redundant waiting-room service with controlled admission, verified tokens, clear waiting information, and protection against repeated attempts to bypass the queue.

### 8.4 Synchronous Checkout vs. Asynchronous Background Work

**Choice:** Keep reservation and purchase confirmation on a transactional path, while moving emails and other non-critical tasks to background workers.

**Advantages:**

* Important booking operations have a clear success or failure result.
* Email delivery does not delay the main transaction unnecessarily.
* Failed background jobs can be retried independently.

**Disadvantages:**

* Background tasks may complete later.
* Queues and workers require monitoring.
* Retried jobs can run more than once.

**Decision:** Keep inventory changes and purchase confirmation consistent, use a durable queue for secondary tasks, and make worker operations idempotent.

## 9. Reliability and Single Points of Failure

TicketHub should avoid relying on one instance of any critical component.

* **Application servers:** Run multiple instances behind a redundant load balancer and check their health automatically.
* **Load balancer:** Use a managed or redundant deployment so one failed load-balancing instance does not stop all API traffic.
* **Database:** Use backups, tested restoration procedures, database monitoring, and a defined primary-failover process. A read replica alone does not eliminate the primary database as a potential single point of failure.
* **Cache:** Use an appropriate redundant cache deployment and provide a controlled fallback to the database.
* **Waiting room:** Replicate its state and avoid making one in-memory process responsible for all queue positions or admission decisions.
* **Queue and workers:** Use durable queue storage and multiple workers, with retries and a dead-letter mechanism for repeatedly failing jobs.
* **Payment processing:** Record payment references, verify provider notifications, and use idempotent processing to recover safely from retries and delayed callbacks.
* **Backups and recovery:** Test restoration and recovery procedures instead of assuming backups will work.

Components should be distributed across failure domains where the hosting platform permits it. The system should monitor error rates, database lock waits, reservation conflicts, queue depth, payment failures, and overall latency.

The design cannot guarantee zero downtime under every provider or regional failure, but redundancy, controlled admission, durable state, monitoring, and tested recovery procedures reduce the likelihood and impact of outages.

## 10. Conclusion

TicketHub needs to handle both steady daily traffic and unusually intense demand when popular concerts go on sale.

The supplied figures imply 500,000 page views per normal day, averaging approximately 5.79 page views per second. For a popular concert sale, 200,000 purchase attempts over ten minutes correspond to an average of approximately 333 attempts per second, competing for only 20,000 seats.

A virtual waiting room and scalable application tier control traffic. A relational database, transactional reservations, row locking or conditional updates, unique constraints, and idempotent payment handling prevent double booking.

By combining these mechanisms with monitoring, redundancy, caching, background processing, and tested recovery procedures, TicketHub can provide a more reliable ticket-buying experience while preserving seat ownership and payment correctness.
