--STUDENT TABLE
CREATE TABLE students (
  student_id INTEGER PRIMARY KEY,
  student_name TEXT NOT NULL,
  student_email TEXT NOT NULL UNIQUE
);

--COURSE TABLE
CREATE TABLE course (
  course_id INTEGER PRIMARY KEY,
  course_name TEXT NOT NULL,
  course_code NOT NULL UNIQUE
);

--ENROLMENTS TABLE 
CREATE TABLE enrolments (
  student_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  grade TEXT,
  PRIMARY KEY (student_id, course_id),
  FOREIGN KEY (student_id) REFERENCES students (student_id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES course (course_id) ON DELETE CASCADE
);

--INSERT STUDENTS
INSERT INTO
  students (student_id, student_name, student_email)
VALUES
  (01, 'Tabitha Muthoni', 'tabby@gmail.com'),
  (02, 'Titus Kaloki', 'tito@gmail.com'),
  (03, 'Paul Wanyonyi', 'paulo@gmail.com'),
  (04, 'Ndolo Blaise', 'blaisendo@yahoo.com');

--INSERT COURSES
INSERT INTO
  course (course_id, course_name, course_code)
VALUES
  (1, 'Microbiology', 'mcro212'),
  (2, 'Public Health', 'ph112'),
  (3, 'Communication skills', 'cm200');

--INSERT ENROLMENT 
INSERT INTO
  enrolments (student_id, course_id, grade)
VALUES
  (1, 1, 'A'),
  (1, 2, 'B+'),
  (2, 1, 'A-'),
  (2, 3, 'B'),
  (3, 2, 'A');

--all courses for one student (by name)
SELECT
  students.student_name,
  course.course_name,
  enrolments.grade
FROM
  students
  JOIN enrolments ON students.student_id = enrolments.student_id
  JOIN course ON course.course_id = enrolments.course_id
WHERE
  student_name = 'Tabitha Muthoni';
  --all students on one course
SELECT
  students.student_name,
  course.course_name
FROM
  students
  JOIN enrolments ON students.student_id = enrolments.student_id
  JOIN course ON course.course_id = enrolments.course_id
WHERE
  course_name = 'Microbiology';
  -- the number of students per course
SELECT
  course.course_name,
  COUNT(enrolments.student_id) AS student_count
FROM
  course
  LEFT JOIN enrolments ON course.course_id = enrolments.course_id
GROUP BY
  course.course_id,
  course.course_name;

--students who have no enrolments
SELECT
  students.student_id,
  students.student_name,
  students.student_email
FROM
  students
  LEFT JOIN enrolments ON students.student_id = enrolments.student_id
WHERE
  enrolments.student_id IS NULL;
  -- QUERY 5: Update one enrolment's grade
UPDATE enrolments
SET
  grade = 'A'
WHERE
  student_id = 2
  AND course_id = 1;

-- Verify the updated grade
SELECT
  students.student_name,
  course.course_name,
  enrolments.grade
FROM
  enrolments
  JOIN students ON enrolments.student_id = students.student_id
  JOIN course ON enrolments.course_id = course.course_id
WHERE
  enrolments.student_id = 2
  AND enrolments.course_id = 1;