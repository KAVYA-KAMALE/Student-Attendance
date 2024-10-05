import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ExportMonthlyData.css'; // Add CSS styling

const ExportMonthlyData = () => {
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [studentDetails, setStudentDetails] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [error, setError] = useState('');
    const [dates, setDates] = useState([]); // Store unique dates

    // Fetch attendance records from the API
    const fetchAttendanceRecords = async () => {
        try {
            const response = await axios.get('http://localhost:4000/api/attendance/track-attendance');
            setAttendanceRecords(response.data);
            fetchStudentDetails(response.data);
        } catch (error) {
            setError('Error fetching attendance records');
        }
    };

    // Fetch student details based on unique IDs from attendance records
    const fetchStudentDetails = async (records) => {
        const detailsPromises = records.map(async (record) => {
            const response = await axios.get(`http://localhost:4000/api/students/details/${record.uniqueId}`);
            return {
                rollNo: record.rollNo,
                name: response.data.name,
                semester: response.data.semester,
                feePaid: response.data.feePaid,
                uniqueId: record.uniqueId,
                date: record.date, // Store the date
                meals: {
                    breakfastStatus: record.breakfastStatus || 'A',
                    lunchStatus: record.lunchStatus || 'A',
                    snacksStatus: record.snacksStatus || 'A',
                    dinnerStatus: record.dinnerStatus || 'A',
                },
            };
        });

        const detailsArray = await Promise.all(detailsPromises);
        setStudentDetails(aggregateStudentRecords(detailsArray)); // Aggregate records
    };

    // Aggregate student records by uniqueId and date
    const aggregateStudentRecords = (records) => {
        const aggregatedRecords = {};
        const uniqueDates = new Set(); // To track unique dates

        records.forEach(record => {
            const { uniqueId, rollNo, name, semester, feePaid, date, meals } = record;
            const formattedDate = new Date(date).toLocaleDateString(); // Format date as needed

            uniqueDates.add(formattedDate); // Add date to set

            // If the student is already added, push the meal details
            if (aggregatedRecords[uniqueId]) {
                aggregatedRecords[uniqueId][formattedDate] = meals;
            } else {
                aggregatedRecords[uniqueId] = {
                    rollNo,
                    name,
                    semester,
                    feePaid,
                    [formattedDate]: meals, // Add meals under the date
                };
            }
        });

        setDates([...uniqueDates]); // Convert set to array and store unique dates
        return Object.values(aggregatedRecords); // Convert to array
    };

    // Use useEffect to fetch attendance records on component mount
    useEffect(() => {
        fetchAttendanceRecords();
    }, []);

    // Handle filtering by date
    const handleDateSearch = (e) => {
        e.preventDefault();
        
        if (selectedDate.trim()) {
            const filteredRecords = attendanceRecords.filter(record => {
                const inputDate = new Date(selectedDate).toLocaleDateString();  // Format as mm/dd/yyyy
                const recordDate = new Date(record.date).toLocaleDateString();  // Also format as mm/dd/yyyy
                return recordDate === inputDate;  // Compare formatted dates
            });
            fetchStudentDetails(filteredRecords); // Update student details based on filtered records
        } else {
            fetchAttendanceRecords(); // Reset if date is empty
        }
    };

    // Handle clearing the date search
    const handleClearSearch = () => {
        setSelectedDate('');
        fetchAttendanceRecords(); // Refetch all records to reset the table
    };

    // Function to determine meal status based on the Track Attendance
    const getMealStatus = (student, date, mealType) => {
        // Find the attendance record for the student on the specific date
        const attendanceRecord = attendanceRecords.find(record => record.uniqueId === student.uniqueId && new Date(record.date).toLocaleDateString() === date);
        
        // If attendance record exists for that date, check the meal status
        if (attendanceRecord) {
            return attendanceRecord[mealType] === 'Present' ? 'P' : 'A'; // Return 'P' if present, otherwise 'A'
        }
        return 'A'; // Default to 'A' if no record is found
    };

    return (
        <div className="export-monthly-data-container">
            <h2>Export Monthly Attendance Data</h2>
            {error && <p>{error}</p>}

            {/* Date Search Form */}
            <form onSubmit={handleDateSearch}>
                <div className="date-search-controls">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="search-input"
                    />
                    <button type="submit" className="search-button">Search</button>
                    <button type="button" className="clear-button" onClick={handleClearSearch}>
                        Clear
                    </button>
                </div>
            </form>

            {studentDetails.length > 0 ? (
                <table className="attendance-table">
                    <thead>
                        <tr>
                            <th>Roll No</th>
                            <th>Name</th>
                            <th>Semester</th>
                            <th>Fee Paid</th>
                            {/* Render table headers based on unique dates */}
                            {dates.map((date, index) => (
                                <th key={index} colSpan={4}>{date}</th> // Each date gets 4 columns
                            ))}
                        </tr>
                        <tr>
                            <th></th>
                            <th></th>
                            <th></th>
                            <th></th>
                            {/* Render meal type headers */}
                            {dates.map((date, index) => (
                                <React.Fragment key={index}>
                                    <th>Breakfast</th>
                                    <th>Lunch</th>
                                    <th>Snacks</th>
                                    <th>Dinner</th>
                                </React.Fragment>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {studentDetails.map(record => (
                            <tr key={record.uniqueId}>
                                <td>{record.rollNo}</td>
                                <td>{record.name}</td>
                                <td>{record.semester}</td>
                                <td>{record.feePaid}</td>
                                {/* Render meal statuses for each date */}
                                {dates.map((date, index) => (
                                    <React.Fragment key={index}>
                                        <td>{getMealStatus(record, date, 'breakfastStatus')}</td>
                                        <td>{getMealStatus(record, date, 'lunchStatus')}</td>
                                        <td>{getMealStatus(record, date, 'snacksStatus')}</td>
                                        <td>{getMealStatus(record, date, 'dinnerStatus')}</td>
                                    </React.Fragment>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>No attendance records found for the selected date</p>
            )}
        </div>
    );
};

// Export the component
export default ExportMonthlyData;
