import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './ExportMonthlyData.css'; // Import the CSS file

const ExportMonthlyData = () => {
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [studentDetails, setStudentDetails] = useState({}); // New state for student details
    const [error, setError] = useState('');
    const [fromDate, setFromDate] = useState(''); // For storing the 'from' date input
    const [toDate, setToDate] = useState(''); // For storing the 'to' date input
    const [filteredDates, setFilteredDates] = useState([]); // For storing filtered dates

    // Fetch attendance records from the API
    const fetchAttendanceRecords = async () => {
        try {
            const response = await axios.get('http://localhost:4000/api/attendance/track-attendance');
            setAttendanceRecords(response.data);
            fetchStudentDetails(response.data); // Fetch student details based on attendance records
        } catch (error) {
            setError('Error fetching attendance records');
        }
    };

    // Fetch student details based on uniqueIds in attendance records
    const fetchStudentDetails = async (records) => {
        const uniqueIds = [...new Set(records.map(record => record.uniqueId))];
        try {
            const responses = await Promise.all(
                uniqueIds.map(id => axios.get(`http://localhost:4000/api/students/details/${id}`))
            );
            const details = {};
            responses.forEach(response => {
                details[response.data.uniqueId] = response.data; // Map uniqueId to student details
            });
            setStudentDetails(details);
        } catch (error) {
            setError('Error fetching student details');
        }
    };

    useEffect(() => {
        fetchAttendanceRecords();
    }, []);

    // Group records by student (uniqueId or rollNo)
    const groupByStudent = (records) => {
        return records.reduce((groups, record) => {
            const key = record.uniqueId; // Group by uniqueId or rollNo
            if (!groups[key]) {
                groups[key] = {};
            }
            const date = new Date(record.date).toLocaleDateString(); // Group by date
            groups[key][date] = {
                breakfastStatus: getMealStatus(record, 'Breakfast'),
                lunchStatus: getMealStatus(record, 'Lunch'),
                snacksStatus: getMealStatus(record, 'Snacks'),
                dinnerStatus: getMealStatus(record, 'Dinner'),
            };
            return groups;
        }, {});
    };

    // Group dates in chronological order for columns
    const getUniqueDates = (records) => {
        const uniqueDates = Array.from(
            new Set(records.map(record => new Date(record.date).toLocaleDateString()))
        );
        return uniqueDates.sort((a, b) => new Date(a) - new Date(b)); // Sort dates in ascending order
    };

    // Filter dates based on selected from and to dates
    // Filter dates based on selected from and to dates
const handleSearch = () => {
    if (!fromDate || !toDate) {
        setError('Please select both "from" and "to" dates.');
        return;
    }

    // Create Date objects for fromDate and toDate
    const from = new Date(fromDate);
    const to = new Date(toDate);

    // Adjust the 'from' date to the beginning of the day
    from.setHours(0, 0, 0, 0); // Set to 00:00:00 for the entire day inclusion

    // Adjust the 'to' date to the end of the day
    to.setHours(23, 59, 59, 999); // Set to 23:59:59 for the entire day inclusion

    const filtered = getUniqueDates(attendanceRecords).filter(date => {
        const currentDate = new Date(date);
        return currentDate >= from && currentDate <= to;
    });

    setFilteredDates(filtered);
    setError('');
};

    // Determine the meal type based on time
    const getMealType = (time) => {
        const timeParts = time.match(/(\d{1,2}):(\d{2}):\d{2} (\w{2})/);
        if (!timeParts) return 'No Meal';

        let hours = parseInt(timeParts[1]);
        const minutes = parseInt(timeParts[2]);
        const period = timeParts[3]; // AM or PM

        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        const totalMinutes = hours * 60 + minutes;

        if (totalMinutes >= 450 && totalMinutes < 570) { // Breakfast 7:30 AM to 9:30 AM
            return 'Breakfast';
        } else if (totalMinutes >= 720 && totalMinutes < 840) { // Lunch 12:00 PM to 2:00 PM
            return 'Lunch';
        } else if (totalMinutes >= 1020 && totalMinutes < 1080) { // Snacks 5:00 PM to 6:00 PM
            return 'Snacks';
        } else if (totalMinutes >= 1170 && totalMinutes < 1260) { // Dinner 7:30 PM to 9:00 PM
            return 'Dinner';
        } else {
            return 'No Meal';
        }
    };

    // Get the meal status
    const getMealStatus = (record, mealType) => {
        const currentMealType = getMealType(record.time);
        let breakfastStatus = record.breakfastStatus || 'A'; 
        let lunchStatus = record.lunchStatus || 'A'; 
        let snacksStatus = record.snacksStatus || 'A'; 
        let dinnerStatus = record.dinnerStatus || 'A'; 

        switch (mealType) {
            case 'Breakfast':
                return currentMealType === 'Breakfast' ? 'P' : breakfastStatus;
            case 'Lunch':
                return currentMealType === 'Lunch' ? 'P' : lunchStatus;
            case 'Snacks':
                return currentMealType === 'Snacks' ? 'P' : snacksStatus;
            case 'Dinner':
                return currentMealType === 'Dinner' ? 'P' : dinnerStatus;
            default:
                return 'No Meal';
        }
    };

    const studentRecords = groupByStudent(attendanceRecords);

    return (
        <div className="export-monthly-data-container">
            <h2>Export Monthly Data</h2>
            {error && <p className="error-message">{error}</p>}

            {/* Date range input fields */}
            <div className="date-filter-container">
                <label htmlFor="fromDate">From:</label>
                <input 
                    type="date" 
                    id="fromDate" 
                    value={fromDate} 
                    onChange={(e) => setFromDate(e.target.value)} 
                />
                
                <label htmlFor="toDate">To:</label>
                <input 
                    type="date" 
                    id="toDate" 
                    value={toDate} 
                    onChange={(e) => setToDate(e.target.value)} 
                />
                
                <button onClick={handleSearch}>Search</button>
            </div>

            <table className="monthly-attendance-table">
                <thead>
                    <tr>
                        <th>Roll No</th>
                        <th>Name</th>
                        <th>Semester</th>
                        <th>Fee Paid</th>
                        {filteredDates.map(date => (
                            <th key={date} colSpan="4">{date}</th> // Date as main column, 4 subcolumns
                        ))}
                    </tr>
                    <tr>
                        <th></th>
                        <th></th>
                        <th></th>
                        <th></th>
                        {filteredDates.map(date => (
                            <>
                                <th key={`${date}-breakfast`}>Breakfast</th>
                                <th key={`${date}-lunch`}>Lunch</th>
                                <th key={`${date}-snacks`}>Snacks</th>
                                <th key={`${date}-dinner`}>Dinner</th>
                            </>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Object.keys(studentRecords).map(studentId => (
                        <tr key={studentId}>
                            <td>{studentDetails[studentId]?.rollNo || 'N/A'}</td>
                            <td>{studentDetails[studentId]?.name || 'N/A'}</td>
                            <td>{studentDetails[studentId]?.semester || 'N/A'}</td>
                            <td>{studentDetails[studentId]?.feePaid || 'N/A'}</td>
                            {filteredDates.map(date => (
                                <>
                                    <td key={`${studentId}-${date}-breakfast`}>
                                        {studentRecords[studentId][date]?.breakfastStatus || 'A'}
                                    </td>
                                    <td key={`${studentId}-${date}-lunch`}>
                                        {studentRecords[studentId][date]?.lunchStatus || 'A'}
                                    </td>
                                    <td key={`${studentId}-${date}-snacks`}>
                                        {studentRecords[studentId][date]?.snacksStatus || 'A'}
                                    </td>
                                    <td key={`${studentId}-${date}-dinner`}>
                                        {studentRecords[studentId][date]?.dinnerStatus || 'A'}
                                    </td>
                                </>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ExportMonthlyData;
