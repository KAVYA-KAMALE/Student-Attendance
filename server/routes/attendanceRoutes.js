const express = require('express');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const excel = require('exceljs'); // Add exceljs for Excel export
const moment = require('moment'); // For date manipulation
const router = express.Router();

// Route to mark attendance
router.post('/mark-attendance', async (req, res) => {
  const { uniqueId, status } = req.body;

  console.log("Received data:", req.body); // Log the request body for debugging

  if (!uniqueId || !status) {
    return res.status(400).send('Unique ID and status are required');
  }

  try {
    // Find student by unique ID in the students collection
    const student = await Student.findOne({ uniqueId: uniqueId });

    if (!student) {
      return res.status(404).send('Student not found');
    }

    // Get the current time when marking attendance
    const currentTime = new Date().toLocaleTimeString(); // Format: "HH:MM:SS AM/PM"

    // Create new attendance record with student details and time
    const attendance = new Attendance({
      uniqueId: student.uniqueId,
      name: student.name,
      rollNo: student.rollNo,
      status,
      time: currentTime // Save the time when attendance is marked
    });

    await attendance.save();
    res.status(201).send('Attendance marked successfully');
  } catch (error) {
    res.status(500).send('Error marking attendance: ' + error.message);
  }
});

// Route to get all attendance records
router.get('/track-attendance', async (req, res) => {
  try {
    const attendanceRecords = await Attendance.find();
    res.status(200).json(attendanceRecords); // Return all attendance records, including time
  } catch (error) {
    res.status(500).send('Error fetching attendance records: ' + error.message);
  }
});

// Route to export attendance data as an Excel file
router.get('/export-attendance', async (req, res) => {
  try {
    const attendanceRecords = await Attendance.find();

    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Attendance');

    worksheet.columns = [
      { header: 'Unique ID', key: 'uniqueId', width: 15 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Roll No', key: 'rollNo', width: 15 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Time', key: 'time', width: 15 }, // Added time column for export
      { header: 'Status', key: 'status', width: 10 }
    ];

    attendanceRecords.forEach(record => {
      worksheet.addRow(record);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).send('Error exporting attendance records: ' + error.message);
  }
});

router.get('/track-attendance-by-date', async (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).send('Date is required');
  }

  try {
    // Parse the input date and set to start and end of the day in UTC
    const formattedDate = moment(date).startOf('day').utc().toDate(); // Start of the input day in UTC
    const nextDay = moment(date).endOf('day').utc().toDate(); // End of the input day in UTC

    // Query attendance records that fall between the start and end of the provided date
    const attendanceRecords = await Attendance.find({
      date: { $gte: formattedDate, $lte: nextDay }
    });

    if (attendanceRecords.length === 0) {
      return res.status(404).send('No attendance records found for this date');
    }

    res.status(200).json(attendanceRecords);
  } catch (error) {
    res.status(500).send('Error fetching attendance records: ' + error.message);
  }
});

module.exports = router;
