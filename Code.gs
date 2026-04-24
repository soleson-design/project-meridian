/**
 * PROJECT MERIDIAN - Google Apps Script Backend
 *
 * This script provides a REST API for the Month-End Close Tracker
 * backed by a Google Sheet with a "Tasks" tab.
 *
 * Deployment: Deploy as Web App with Execute as "Me" and access for
 * "Anyone" (or appropriate setting for your organization)
 */

// Configuration - Update this with your actual Sheet ID
const SHEET_ID = 'YOUR_SHEET_ID_HERE';
const TASKS_SHEET_NAME = 'Tasks';

// Column mapping (1-indexed for Google Sheets)
const COLS = {
  TASK_ID: 1,        // A
  AREA: 2,           // B
  TASK_NAME: 3,      // C
  DESCRIPTION: 4,    // D
  OWNER: 5,          // E
  BUSINESS_DAY_DUE: 6, // F
  ENTITY: 7,         // G
  STATUS: 8,         // H
  COMPLETED_BY: 9,   // I
  COMPLETED_AT: 10,  // J
  NOTES: 11          // K
};

/**
 * Handle GET requests
 */
function doGet(e) {
  return handleRequest(e);
}

/**
 * Handle POST requests
 */
function doPost(e) {
  return handleRequest(e);
}

/**
 * Main request handler
 */
function handleRequest(e) {
  try {
    // Enable CORS
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);

    // Parse parameters
    const params = e.parameter || {};
    const action = params.action;

    // Route to appropriate handler
    let result;
    switch (action) {
      case 'getTasks':
        result = getTasks();
        break;

      case 'updateTask':
        result = updateTask(params);
        break;

      case 'resetTask':
        result = resetTask(params);
        break;

      default:
        result = {
          success: false,
          error: 'Invalid action. Supported actions: getTasks, updateTask, resetTask'
        };
    }

    output.setContent(JSON.stringify(result));
    return output;

  } catch (error) {
    const errorResult = {
      success: false,
      error: error.toString()
    };

    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);
    output.setContent(JSON.stringify(errorResult));
    return output;
  }
}

/**
 * Get all tasks from the Tasks sheet
 * Returns: { success: true, data: [...] }
 */
function getTasks() {
  try {
    const sheet = openTasksSheet();
    const data = sheet.getDataRange().getValues();

    // Skip header row (row 0) and convert to objects
    const tasks = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // Skip empty rows
      if (!row[COLS.TASK_ID - 1]) continue;

      tasks.push({
        taskId: row[COLS.TASK_ID - 1],
        area: row[COLS.AREA - 1],
        taskName: row[COLS.TASK_NAME - 1],
        description: row[COLS.DESCRIPTION - 1],
        owner: row[COLS.OWNER - 1],
        businessDayDue: row[COLS.BUSINESS_DAY_DUE - 1],
        entity: row[COLS.ENTITY - 1],
        status: row[COLS.STATUS - 1],
        completedBy: row[COLS.COMPLETED_BY - 1],
        completedAt: row[COLS.COMPLETED_AT - 1],
        notes: row[COLS.NOTES - 1]
      });
    }

    return {
      success: true,
      data: tasks
    };

  } catch (error) {
    return {
      success: false,
      error: 'Failed to fetch tasks: ' + error.toString()
    };
  }
}

/**
 * Update a task's status and related fields
 * Params: taskId, status, completedBy, notes
 * Returns: { success: true, data: {...} }
 */
function updateTask(params) {
  try {
    const taskId = params.taskId;
    const status = params.status;
    const completedBy = params.completedBy || '';
    const notes = params.notes || '';

    if (!taskId) {
      return {
        success: false,
        error: 'taskId is required'
      };
    }

    if (!status) {
      return {
        success: false,
        error: 'status is required'
      };
    }

    const sheet = openTasksSheet();
    const data = sheet.getDataRange().getValues();

    // Find the row with matching TaskID
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][COLS.TASK_ID - 1] === taskId) {
        rowIndex = i + 1; // +1 because Sheets are 1-indexed
        break;
      }
    }

    if (rowIndex === -1) {
      return {
        success: false,
        error: 'Task not found: ' + taskId
      };
    }

    // Update the row
    sheet.getRange(rowIndex, COLS.STATUS).setValue(status);
    sheet.getRange(rowIndex, COLS.NOTES).setValue(notes);

    // If status is "Complete", stamp timestamp and completedBy
    if (status === 'Complete') {
      const timestamp = new Date().toISOString();
      sheet.getRange(rowIndex, COLS.COMPLETED_BY).setValue(completedBy);
      sheet.getRange(rowIndex, COLS.COMPLETED_AT).setValue(timestamp);
    } else {
      // If not complete, clear completion fields
      sheet.getRange(rowIndex, COLS.COMPLETED_BY).setValue('');
      sheet.getRange(rowIndex, COLS.COMPLETED_AT).setValue('');
    }

    // Return updated task data
    const updatedRow = sheet.getRange(rowIndex, 1, 1, 11).getValues()[0];
    const updatedTask = {
      taskId: updatedRow[COLS.TASK_ID - 1],
      area: updatedRow[COLS.AREA - 1],
      taskName: updatedRow[COLS.TASK_NAME - 1],
      description: updatedRow[COLS.DESCRIPTION - 1],
      owner: updatedRow[COLS.OWNER - 1],
      businessDayDue: updatedRow[COLS.BUSINESS_DAY_DUE - 1],
      entity: updatedRow[COLS.ENTITY - 1],
      status: updatedRow[COLS.STATUS - 1],
      completedBy: updatedRow[COLS.COMPLETED_BY - 1],
      completedAt: updatedRow[COLS.COMPLETED_AT - 1],
      notes: updatedRow[COLS.NOTES - 1]
    };

    return {
      success: true,
      data: updatedTask
    };

  } catch (error) {
    return {
      success: false,
      error: 'Failed to update task: ' + error.toString()
    };
  }
}

/**
 * Reset a task back to "Not Started" and clear completion fields
 * Params: taskId
 * Returns: { success: true, data: {...} }
 */
function resetTask(params) {
  try {
    const taskId = params.taskId;

    if (!taskId) {
      return {
        success: false,
        error: 'taskId is required'
      };
    }

    const sheet = openTasksSheet();
    const data = sheet.getDataRange().getValues();

    // Find the row with matching TaskID
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][COLS.TASK_ID - 1] === taskId) {
        rowIndex = i + 1; // +1 because Sheets are 1-indexed
        break;
      }
    }

    if (rowIndex === -1) {
      return {
        success: false,
        error: 'Task not found: ' + taskId
      };
    }

    // Reset fields
    sheet.getRange(rowIndex, COLS.STATUS).setValue('Not Started');
    sheet.getRange(rowIndex, COLS.COMPLETED_BY).setValue('');
    sheet.getRange(rowIndex, COLS.COMPLETED_AT).setValue('');
    sheet.getRange(rowIndex, COLS.NOTES).setValue('');

    // Return updated task data
    const updatedRow = sheet.getRange(rowIndex, 1, 1, 11).getValues()[0];
    const updatedTask = {
      taskId: updatedRow[COLS.TASK_ID - 1],
      area: updatedRow[COLS.AREA - 1],
      taskName: updatedRow[COLS.TASK_NAME - 1],
      description: updatedRow[COLS.DESCRIPTION - 1],
      owner: updatedRow[COLS.OWNER - 1],
      businessDayDue: updatedRow[COLS.BUSINESS_DAY_DUE - 1],
      entity: updatedRow[COLS.ENTITY - 1],
      status: updatedRow[COLS.STATUS - 1],
      completedBy: updatedRow[COLS.COMPLETED_BY - 1],
      completedAt: updatedRow[COLS.COMPLETED_AT - 1],
      notes: updatedRow[COLS.NOTES - 1]
    };

    return {
      success: true,
      data: updatedTask
    };

  } catch (error) {
    return {
      success: false,
      error: 'Failed to reset task: ' + error.toString()
    };
  }
}

/**
 * Helper: Open the Tasks sheet
 */
function openTasksSheet() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  const sheet = spreadsheet.getSheetByName(TASKS_SHEET_NAME);

  if (!sheet) {
    throw new Error('Tasks sheet not found. Please create a sheet named "Tasks"');
  }

  return sheet;
}
