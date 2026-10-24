# School Database Design

## 1. Tables

### Students

The `students` table stores student information, including each student's ID, name, and email address. The student ID is the primary key, and each email address must be unique.

### Course

The `course` table stores information about available courses, including the course ID, course name, and course code. The course ID is the primary key.

### Enrolments

The `enrolments` table connects students to courses and stores the grade a student receives in a particular course. It uses a composite primary key consisting of `student_id` and `course_id` to prevent the same student from enrolling in the same course twice. Foreign keys ensure that each enrolment refers to an existing student and course.

## 2. Relationships

### One-to-Many Relationships

* **Students to Enrolments:** One student can have multiple enrolment records, but each enrolment belongs to one student.
* **Course to Enrolments:** One course can have multiple enrolment records, but each enrolment refers to one course.

### Many-to-Many Relationship

Students and courses have a many-to-many relationship. A student can enrol in multiple courses, and each course can have multiple students.

The `enrolments` table acts as a join table between `students` and `course`. It is needed to connect the two tables, store each student-course relationship, and record the student's grade for that course.

## 3. Index

I would add an index on `enrolments(course_id)`:

```sql
CREATE INDEX idx_enrolments_course_id
ON enrolments(course_id);
```

This index would help queries that find all students enrolled in a particular course and count the enrolments for each course. It can make these searches and joins more efficient as the database grows.

## 4. SQL or NoSQL?

I would choose SQL for this school database because the data is structured and has clear relationships between students, courses, and enrolments. SQL supports primary keys, foreign keys, unique constraints, and joins, which help maintain data integrity and retrieve related information efficiently. Since the system needs to prevent duplicate enrolments and associate grades with specific student-course combinations, a relational database such as SQLite is a suitable choice.
