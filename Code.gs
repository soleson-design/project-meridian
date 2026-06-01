/**
 * MONTH END CLOSE TRACKER - Google Apps Script Backend
 *
 * This script provides a REST API for the Month-End Close Tracker
 * backed by a Google Sheet with "Tasks" and "TaskStatus" tabs.
 *
 * Architecture:
 * - Tasks tab: Master list of recurring tasks (TaskID, Area, TaskName, etc.)
 * - TaskStatus tab: Period-specific status tracking (Period, TaskID, Status, CompletedBy, etc.)
 *
 * Security Model:
 * - Deploy as Web App with Execute as "Me" and access "Anyone"
 * - The Google Sheet itself remains private
 * - Only the owner can edit the Sheet directly
 * - The app provides a controlled interface to the data
 *
 * Deployment: Deploy as Web App with Execute as "Me" and access for "Anyone"
 */

// Configuration
const SHEET_ID = '1aND_gZScmiDQFZeJDZivma_Yss90V-w1qH2PPzj0eO0';
const TASKS_SHEET_NAME = 'Tasks';
const TASK_STATUS_SHEET_NAME = 'TaskStatus';

// Tasks tab column mapping (1-indexed for Google Sheets)
const TASK_COLS = {
  TASK_ID: 1,        // A
  AREA: 2,           // B
  TASK_NAME: 3,      // C
  DESCRIPTION: 4,    // D
  OWNER: 5,          // E
  BUSINESS_DAY_DUE: 6, // F
  ENTITY: 7          // G
};

// TaskStatus tab column mapping (1-indexed for Google Sheets)
const STATUS_COLS = {
  PERIOD: 1,         // A - e.g., "April-2026"
  TASK_ID: 2,        // B
  STATUS: 3,         // C
  COMPLETED_BY: 4,   // D
  COMPLETED_AT: 5,   // E
  NOTES: 6,          // F
  REVIEWED_BY: 7,    // G
  REVIEWED_AT: 8     // H
};

/**
 * Handle OPTIONS requests (CORS preflight)
 */
function doOptions(e) {
  return createCORSResponse({});
}

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
    // Parse parameters from POST body or GET parameters
    let params = {};

    if (e.postData && e.postData.contents) {
      // POST request - parse JSON body
      try {
        params = JSON.parse(e.postData.contents);
      } catch (parseError) {
        return createCORSResponse({
          success: false,
          error: 'Invalid JSON in request body: ' + parseError.toString()
        });
      }
    } else {
      // GET request - use URL parameters
      params = e.parameter || {};
    }

    const action = params.action;

    // Route to appropriate handler
    let result;
    switch (action) {
      case 'getTasks':
        result = getTasks(params);
        break;

      case 'updateTask':
        result = updateTask(params);
        break;

      case 'resetTask':
        result = resetTask(params);
        break;

      case 'reviewTask':
        result = reviewTask(params);
        break;

      case 'resetReview':
        result = resetReview(params);
        break;

      default:
        result = {
          success: false,
          error: 'Invalid action. Supported actions: getTasks, updateTask, resetTask, reviewTask, resetReview'
        };
    }

    return createCORSResponse(result);

  } catch (error) {
    return createCORSResponse({
      success: false,
      error: error.toString()
    });
  }
}

/**
 * Create a response with CORS headers
 */
function createCORSResponse(data) {
  const jsonData = JSON.stringify(data);
  const output = ContentService.createTextOutput(jsonData);
  output.setMimeType(ContentService.MimeType.JSON);

  // Note: Google Apps Script doesn't allow setting custom headers directly
  // CORS is handled automatically by Google when deployed as "Anyone"

  return output;
}

/**
 * Helper: Find existing status row for a given period and taskId
 * Returns the 1-indexed row number, or -1 if not found
 */
function findStatusRow(statusSheet, period, taskId) {
  const statusData = statusSheet.getDataRange().getValues();

  // Convert to strings for reliable comparison
  const searchPeriod = String(period).trim();
  const searchTaskId = String(taskId).trim();

  // Start from row 1 (skip header row 0)
  for (let i = 1; i < statusData.length; i++) {
    const rowPeriod = String(statusData[i][STATUS_COLS.PERIOD - 1]).trim();
    const rowTaskId = String(statusData[i][STATUS_COLS.TASK_ID - 1]).trim();

    if (rowPeriod === searchPeriod && rowTaskId === searchTaskId) {
      return i + 1; // Return 1-indexed row number for Sheets API
    }
  }

  return -1; // Not found
}

/**
 * Get all tasks from the Tasks sheet merged with period-specific status
 * Params: period (e.g., "April-2026")
 * Returns: { success: true, data: [...] }
 */
function getTasks(params) {
  try {
    const period = params.period;
    if (!period) {
      return {
        success: false,
        error: 'period is required'
      };
    }

    const tasksSheet = openTasksSheet();
    const statusSheet = openTaskStatusSheet();

    // Read all tasks
    const tasksData = tasksSheet.getDataRange().getValues();

    // Read all status records for this period
    const statusData = statusSheet.getDataRange().getValues();
    const statusMap = {};

    // Convert search period to string for consistent comparison
    const searchPeriod = String(period).trim();

    // Build a map of TaskID -> status record for this period
    for (let i = 1; i < statusData.length; i++) {
      const row = statusData[i];
      const rowPeriod = String(row[STATUS_COLS.PERIOD - 1]).trim();
      const taskId = String(row[STATUS_COLS.TASK_ID - 1]).trim();

      if (rowPeriod === searchPeriod && taskId) {
        statusMap[taskId] = {
          status: row[STATUS_COLS.STATUS - 1] || 'Not Started',
          completedBy: row[STATUS_COLS.COMPLETED_BY - 1] || '',
          completedAt: row[STATUS_COLS.COMPLETED_AT - 1] || '',
          notes: row[STATUS_COLS.NOTES - 1] || '',
          reviewedBy: row[STATUS_COLS.REVIEWED_BY - 1] || '',
          reviewedAt: row[STATUS_COLS.REVIEWED_AT - 1] || ''
        };
      }
    }

    // Build task list with merged status
    const tasks = [];
    for (let i = 1; i < tasksData.length; i++) {
      const row = tasksData[i];

      // Skip empty rows
      if (!row[TASK_COLS.TASK_ID - 1]) continue;

      const taskId = String(row[TASK_COLS.TASK_ID - 1]).trim();
      const statusInfo = statusMap[taskId] || {
        status: 'Not Started',
        completedBy: '',
        completedAt: '',
        notes: '',
        reviewedBy: '',
        reviewedAt: ''
      };

      tasks.push({
        taskId: taskId,
        area: row[TASK_COLS.AREA - 1],
        taskName: row[TASK_COLS.TASK_NAME - 1],
        description: row[TASK_COLS.DESCRIPTION - 1],
        owner: row[TASK_COLS.OWNER - 1],
        businessDayDue: row[TASK_COLS.BUSINESS_DAY_DUE - 1],
        entity: row[TASK_COLS.ENTITY - 1],
        status: statusInfo.status,
        completedBy: statusInfo.completedBy,
        completedAt: statusInfo.completedAt,
        notes: statusInfo.notes,
        reviewedBy: statusInfo.reviewedBy,
        reviewedAt: statusInfo.reviewedAt
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
 * Update a task's status and related fields for a specific period
 * Params: period, taskId, status, completedBy, notes
 * Returns: { success: true, data: {...} }
 */
function updateTask(params) {
  try {
    const period = String(params.period || '').trim();
    const taskId = String(params.taskId || '').trim();
    const status = params.status;
    const completedBy = params.completedBy || '';
    const notes = params.notes || '';

    if (!period) {
      return {
        success: false,
        error: 'period is required'
      };
    }

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

    // Verify task exists in Tasks sheet
    const tasksSheet = openTasksSheet();
    const tasksData = tasksSheet.getDataRange().getValues();
    let taskExists = false;
    let taskInfo = null;

    for (let i = 1; i < tasksData.length; i++) {
      if (String(tasksData[i][TASK_COLS.TASK_ID - 1]).trim() === taskId) {
        taskExists = true;
        taskInfo = {
          area: tasksData[i][TASK_COLS.AREA - 1],
          taskName: tasksData[i][TASK_COLS.TASK_NAME - 1],
          description: tasksData[i][TASK_COLS.DESCRIPTION - 1],
          owner: tasksData[i][TASK_COLS.OWNER - 1],
          businessDayDue: tasksData[i][TASK_COLS.BUSINESS_DAY_DUE - 1],
          entity: tasksData[i][TASK_COLS.ENTITY - 1]
        };
        break;
      }
    }

    if (!taskExists) {
      return {
        success: false,
        error: 'Task not found: ' + taskId
      };
    }

    // Find or create status record in TaskStatus sheet
    const statusSheet = openTaskStatusSheet();
    let rowIndex = findStatusRow(statusSheet, period, taskId);

    // If no existing record found, create new row
    if (rowIndex === -1) {
      rowIndex = statusSheet.getLastRow() + 1;

      // Set period and taskId for the new row
      statusSheet.getRange(rowIndex, STATUS_COLS.PERIOD).setValue(period);
      statusSheet.getRange(rowIndex, STATUS_COLS.TASK_ID).setValue(taskId);

      // Apply @STRING@ format to the Period column to prevent date conversion
      const periodCell = statusSheet.getRange(rowIndex, STATUS_COLS.PERIOD);
      periodCell.setNumberFormat('@STRING@');
    }

    // Update status fields (whether new row or existing row)
    statusSheet.getRange(rowIndex, STATUS_COLS.STATUS).setValue(status);
    statusSheet.getRange(rowIndex, STATUS_COLS.NOTES).setValue(notes);

    // If status is "Complete", stamp timestamp and completedBy
    if (status === 'Complete') {
      const timestamp = new Date().toISOString();
      statusSheet.getRange(rowIndex, STATUS_COLS.COMPLETED_BY).setValue(completedBy);
      statusSheet.getRange(rowIndex, STATUS_COLS.COMPLETED_AT).setValue(timestamp);
    } else {
      // If not complete, clear completion fields
      statusSheet.getRange(rowIndex, STATUS_COLS.COMPLETED_BY).setValue('');
      statusSheet.getRange(rowIndex, STATUS_COLS.COMPLETED_AT).setValue('');
    }

    // Return merged task data
    const updatedRow = statusSheet.getRange(rowIndex, 1, 1, 8).getValues()[0];
    const updatedTask = {
      taskId: taskId,
      area: taskInfo.area,
      taskName: taskInfo.taskName,
      description: taskInfo.description,
      owner: taskInfo.owner,
      businessDayDue: taskInfo.businessDayDue,
      entity: taskInfo.entity,
      status: updatedRow[STATUS_COLS.STATUS - 1],
      completedBy: updatedRow[STATUS_COLS.COMPLETED_BY - 1],
      completedAt: updatedRow[STATUS_COLS.COMPLETED_AT - 1],
      notes: updatedRow[STATUS_COLS.NOTES - 1],
      reviewedBy: updatedRow[STATUS_COLS.REVIEWED_BY - 1],
      reviewedAt: updatedRow[STATUS_COLS.REVIEWED_AT - 1]
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
 * Leaves review fields (ReviewedBy, ReviewedAt) untouched
 * Params: period, taskId
 * Returns: { success: true, data: {...} }
 */
function resetTask(params) {
  try {
    const period = String(params.period || '').trim();
    const taskId = String(params.taskId || '').trim();

    if (!period) {
      return {
        success: false,
        error: 'period is required'
      };
    }

    if (!taskId) {
      return {
        success: false,
        error: 'taskId is required'
      };
    }

    // Get task info from Tasks sheet
    const tasksSheet = openTasksSheet();
    const tasksData = tasksSheet.getDataRange().getValues();
    let taskInfo = null;

    for (let i = 1; i < tasksData.length; i++) {
      if (String(tasksData[i][TASK_COLS.TASK_ID - 1]).trim() === taskId) {
        taskInfo = {
          area: tasksData[i][TASK_COLS.AREA - 1],
          taskName: tasksData[i][TASK_COLS.TASK_NAME - 1],
          description: tasksData[i][TASK_COLS.DESCRIPTION - 1],
          owner: tasksData[i][TASK_COLS.OWNER - 1],
          businessDayDue: tasksData[i][TASK_COLS.BUSINESS_DAY_DUE - 1],
          entity: tasksData[i][TASK_COLS.ENTITY - 1]
        };
        break;
      }
    }

    if (!taskInfo) {
      return {
        success: false,
        error: 'Task not found: ' + taskId
      };
    }

    // Find status record in TaskStatus sheet
    const statusSheet = openTaskStatusSheet();
    const rowIndex = findStatusRow(statusSheet, period, taskId);

    if (rowIndex === -1) {
      // No status record exists - return default state
      return {
        success: true,
        data: {
          taskId: taskId,
          area: taskInfo.area,
          taskName: taskInfo.taskName,
          description: taskInfo.description,
          owner: taskInfo.owner,
          businessDayDue: taskInfo.businessDayDue,
          entity: taskInfo.entity,
          status: 'Not Started',
          completedBy: '',
          completedAt: '',
          notes: '',
          reviewedBy: '',
          reviewedAt: ''
        }
      };
    }

    // Reset completion fields only (leave review fields untouched)
    statusSheet.getRange(rowIndex, STATUS_COLS.STATUS).setValue('Not Started');
    statusSheet.getRange(rowIndex, STATUS_COLS.COMPLETED_BY).setValue('');
    statusSheet.getRange(rowIndex, STATUS_COLS.COMPLETED_AT).setValue('');
    statusSheet.getRange(rowIndex, STATUS_COLS.NOTES).setValue('');

    // Return merged task data
    const updatedRow = statusSheet.getRange(rowIndex, 1, 1, 8).getValues()[0];
    const updatedTask = {
      taskId: taskId,
      area: taskInfo.area,
      taskName: taskInfo.taskName,
      description: taskInfo.description,
      owner: taskInfo.owner,
      businessDayDue: taskInfo.businessDayDue,
      entity: taskInfo.entity,
      status: updatedRow[STATUS_COLS.STATUS - 1],
      completedBy: updatedRow[STATUS_COLS.COMPLETED_BY - 1],
      completedAt: updatedRow[STATUS_COLS.COMPLETED_AT - 1],
      notes: updatedRow[STATUS_COLS.NOTES - 1],
      reviewedBy: updatedRow[STATUS_COLS.REVIEWED_BY - 1],
      reviewedAt: updatedRow[STATUS_COLS.REVIEWED_AT - 1]
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
 * Review a task (sign off as reviewer)
 * Params: period, taskId, reviewedBy
 * Returns: { success: true, data: {...} }
 */
function reviewTask(params) {
  try {
    const period = String(params.period || '').trim();
    const taskId = String(params.taskId || '').trim();
    const reviewedBy = params.reviewedBy || '';

    if (!period) {
      return {
        success: false,
        error: 'period is required'
      };
    }

    if (!taskId) {
      return {
        success: false,
        error: 'taskId is required'
      };
    }

    if (!reviewedBy) {
      return {
        success: false,
        error: 'reviewedBy is required'
      };
    }

    // Get task info from Tasks sheet
    const tasksSheet = openTasksSheet();
    const tasksData = tasksSheet.getDataRange().getValues();
    let taskInfo = null;

    for (let i = 1; i < tasksData.length; i++) {
      if (String(tasksData[i][TASK_COLS.TASK_ID - 1]).trim() === taskId) {
        taskInfo = {
          area: tasksData[i][TASK_COLS.AREA - 1],
          taskName: tasksData[i][TASK_COLS.TASK_NAME - 1],
          description: tasksData[i][TASK_COLS.DESCRIPTION - 1],
          owner: tasksData[i][TASK_COLS.OWNER - 1],
          businessDayDue: tasksData[i][TASK_COLS.BUSINESS_DAY_DUE - 1],
          entity: tasksData[i][TASK_COLS.ENTITY - 1]
        };
        break;
      }
    }

    if (!taskInfo) {
      return {
        success: false,
        error: 'Task not found: ' + taskId
      };
    }

    // Find status record in TaskStatus sheet
    const statusSheet = openTaskStatusSheet();
    const rowIndex = findStatusRow(statusSheet, period, taskId);

    if (rowIndex === -1) {
      return {
        success: false,
        error: 'No status record found for this task and period. Task must be completed before review.'
      };
    }

    // Verify task is completed before allowing review
    const statusData = statusSheet.getDataRange().getValues();
    const taskStatus = statusData[rowIndex - 1][STATUS_COLS.STATUS - 1];

    if (taskStatus !== 'Complete') {
      return {
        success: false,
        error: 'Task must be Complete before it can be reviewed'
      };
    }

    // Update review fields on the existing row
    const timestamp = new Date().toISOString();
    statusSheet.getRange(rowIndex, STATUS_COLS.REVIEWED_BY).setValue(reviewedBy);
    statusSheet.getRange(rowIndex, STATUS_COLS.REVIEWED_AT).setValue(timestamp);

    // Return merged task data
    const updatedRow = statusSheet.getRange(rowIndex, 1, 1, 8).getValues()[0];
    const updatedTask = {
      taskId: taskId,
      area: taskInfo.area,
      taskName: taskInfo.taskName,
      description: taskInfo.description,
      owner: taskInfo.owner,
      businessDayDue: taskInfo.businessDayDue,
      entity: taskInfo.entity,
      status: updatedRow[STATUS_COLS.STATUS - 1],
      completedBy: updatedRow[STATUS_COLS.COMPLETED_BY - 1],
      completedAt: updatedRow[STATUS_COLS.COMPLETED_AT - 1],
      notes: updatedRow[STATUS_COLS.NOTES - 1],
      reviewedBy: updatedRow[STATUS_COLS.REVIEWED_BY - 1],
      reviewedAt: updatedRow[STATUS_COLS.REVIEWED_AT - 1]
    };

    return {
      success: true,
      data: updatedTask
    };

  } catch (error) {
    return {
      success: false,
      error: 'Failed to review task: ' + error.toString()
    };
  }
}

/**
 * Reset review fields only (clear ReviewedBy and ReviewedAt)
 * Leaves status, completion fields, and notes untouched
 * Params: period, taskId
 * Returns: { success: true, data: {...} }
 */
function resetReview(params) {
  try {
    const period = String(params.period || '').trim();
    const taskId = String(params.taskId || '').trim();

    if (!period) {
      return {
        success: false,
        error: 'period is required'
      };
    }

    if (!taskId) {
      return {
        success: false,
        error: 'taskId is required'
      };
    }

    // Get task info from Tasks sheet
    const tasksSheet = openTasksSheet();
    const tasksData = tasksSheet.getDataRange().getValues();
    let taskInfo = null;

    for (let i = 1; i < tasksData.length; i++) {
      if (String(tasksData[i][TASK_COLS.TASK_ID - 1]).trim() === taskId) {
        taskInfo = {
          area: tasksData[i][TASK_COLS.AREA - 1],
          taskName: tasksData[i][TASK_COLS.TASK_NAME - 1],
          description: tasksData[i][TASK_COLS.DESCRIPTION - 1],
          owner: tasksData[i][TASK_COLS.OWNER - 1],
          businessDayDue: tasksData[i][TASK_COLS.BUSINESS_DAY_DUE - 1],
          entity: tasksData[i][TASK_COLS.ENTITY - 1]
        };
        break;
      }
    }

    if (!taskInfo) {
      return {
        success: false,
        error: 'Task not found: ' + taskId
      };
    }

    // Find status record in TaskStatus sheet
    const statusSheet = openTaskStatusSheet();
    const rowIndex = findStatusRow(statusSheet, period, taskId);

    if (rowIndex === -1) {
      // No status record exists - return default state
      return {
        success: true,
        data: {
          taskId: taskId,
          area: taskInfo.area,
          taskName: taskInfo.taskName,
          description: taskInfo.description,
          owner: taskInfo.owner,
          businessDayDue: taskInfo.businessDayDue,
          entity: taskInfo.entity,
          status: 'Not Started',
          completedBy: '',
          completedAt: '',
          notes: '',
          reviewedBy: '',
          reviewedAt: ''
        }
      };
    }

    // Clear review fields only on the existing row
    statusSheet.getRange(rowIndex, STATUS_COLS.REVIEWED_BY).setValue('');
    statusSheet.getRange(rowIndex, STATUS_COLS.REVIEWED_AT).setValue('');

    // Return merged task data
    const updatedRow = statusSheet.getRange(rowIndex, 1, 1, 8).getValues()[0];
    const updatedTask = {
      taskId: taskId,
      area: taskInfo.area,
      taskName: taskInfo.taskName,
      description: taskInfo.description,
      owner: taskInfo.owner,
      businessDayDue: taskInfo.businessDayDue,
      entity: taskInfo.entity,
      status: updatedRow[STATUS_COLS.STATUS - 1],
      completedBy: updatedRow[STATUS_COLS.COMPLETED_BY - 1],
      completedAt: updatedRow[STATUS_COLS.COMPLETED_AT - 1],
      notes: updatedRow[STATUS_COLS.NOTES - 1],
      reviewedBy: updatedRow[STATUS_COLS.REVIEWED_BY - 1],
      reviewedAt: updatedRow[STATUS_COLS.REVIEWED_AT - 1]
    };

    return {
      success: true,
      data: updatedTask
    };

  } catch (error) {
    return {
      success: false,
      error: 'Failed to reset review: ' + error.toString()
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

/**
 * Helper: Open the TaskStatus sheet
 */
function openTaskStatusSheet() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  let sheet = spreadsheet.getSheetByName(TASK_STATUS_SHEET_NAME);

  // Create the sheet if it doesn't exist
  if (!sheet) {
    sheet = spreadsheet.insertSheet(TASK_STATUS_SHEET_NAME);

    // Add header row
    const headers = ['Period', 'TaskID', 'Status', 'CompletedBy', 'CompletedAt', 'Notes', 'ReviewedBy', 'ReviewedAt'];
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#f3f3f3');

    // Format the Period column as @STRING@ to prevent date conversion
    const periodColumn = sheet.getRange(2, STATUS_COLS.PERIOD, sheet.getMaxRows() - 1, 1);
    periodColumn.setNumberFormat('@STRING@');
  }

  return sheet;
}
