/*
 * PROJECT MERIDIAN - Application Logic
 */

// ===== Global State =====
const AppState = {
    tasks: [],
    owners: [],
    currentTab: null,
    selectedEntity: {},
    summaryEntityFilter: 'All',
    selectedMonth: null,
    selectedYear: null,
    pendingCompleteTask: null
};

// ===== Main App Object =====
const App = {
    /**
     * Initialize the application
     */
    init() {
        console.log('Project Meridian initializing...');

        // Initialize period selectors
        this.initPeriodSelectors();

        // Load tasks
        this.loadTasks();

        // Set up auto-refresh (60 seconds for Summary tab, 30 seconds for others)
        setInterval(() => {
            if (AppState.currentTab === 'Summary') {
                this.loadTasks();
            }
        }, 60000);

        setInterval(() => {
            if (AppState.currentTab !== 'Summary') {
                this.loadTasks();
            }
        }, CONFIG.REFRESH_INTERVAL);
    },

    /**
     * Initialize month/year selectors
     */
    initPeriodSelectors() {
        const now = new Date();
        AppState.selectedMonth = now.getMonth();
        AppState.selectedYear = now.getFullYear();

        // Populate year selector (current year ± 2 years)
        const yearSelect = document.getElementById('yearSelector');
        for (let year = now.getFullYear() - 2; year <= now.getFullYear() + 2; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === now.getFullYear()) {
                option.selected = true;
            }
            yearSelect.appendChild(option);
        }

        // Set current month
        document.getElementById('monthSelector').value = now.getMonth();

        // Add event listeners
        document.getElementById('monthSelector').addEventListener('change', (e) => {
            AppState.selectedMonth = parseInt(e.target.value);
            this.renderCurrentTab();
        });

        document.getElementById('yearSelector').addEventListener('change', (e) => {
            AppState.selectedYear = parseInt(e.target.value);
            this.renderCurrentTab();
        });
    },

    /**
     * Load tasks from Google Apps Script API
     */
    async loadTasks() {
        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                mode: 'cors',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'getTasks'
                })
            });

            // Check if response is ok
            if (!response.ok) {
                // Handle authentication/authorization errors
                if (response.status === 401 || response.status === 403) {
                    throw new Error('AUTH_REQUIRED');
                }
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to load tasks');
            }

            AppState.tasks = result.data || [];

            // Extract unique owners dynamically
            const ownerSet = new Set();
            AppState.tasks.forEach(task => {
                if (task.owner) {
                    ownerSet.add(task.owner);
                }
            });

            // Sort owners: "Shared" first, then alphabetically
            AppState.owners = Array.from(ownerSet).sort((a, b) => {
                if (a === 'Shared') return -1;
                if (b === 'Shared') return 1;
                return a.localeCompare(b);
            });

            // Add "Summary" tab at the end
            AppState.owners.push('Summary');

            // Initialize selected entity filters
            AppState.owners.forEach(owner => {
                if (!AppState.selectedEntity[owner]) {
                    AppState.selectedEntity[owner] = 'All';
                }
            });

            // Render UI
            this.renderTabs();

            // Select first tab if none selected
            if (!AppState.currentTab && AppState.owners.length > 0) {
                AppState.currentTab = AppState.owners[0];
            }

            this.renderCurrentTab();

            // Hide loading, show content
            document.getElementById('loadingState').style.display = 'none';
            document.getElementById('errorState').style.display = 'none';
            document.getElementById('tabContent').style.display = 'block';

        } catch (error) {
            console.error('Error loading tasks:', error);
            document.getElementById('loadingState').style.display = 'none';
            document.getElementById('errorState').style.display = 'block';

            // Handle different error types
            this.displayError(error);
        }
    },

    /**
     * Display appropriate error message based on error type
     */
    displayError(error) {
        const errorContainer = document.getElementById('errorMessage');

        // Check for authentication error
        if (error.message === 'AUTH_REQUIRED') {
            errorContainer.innerHTML = `
                <strong>Authentication Required</strong>
                <p>This app uses a Google Workspace Apps Script that requires authentication.</p>
                <p><strong>To authenticate:</strong></p>
                <ol style="text-align: left; display: inline-block; margin: 16px 0;">
                    <li>Click the button below to open the API in a new tab</li>
                    <li>Sign in with your Anaconda Google account</li>
                    <li>Authorize access if prompted</li>
                    <li>Return to this page and click "Retry"</li>
                </ol>
                <div style="margin-top: 16px;">
                    <a href="${CONFIG.API_URL}" target="_blank" class="btn-auth">
                        Authenticate with Google
                    </a>
                </div>
            `;
            return;
        }

        // Check for network/CORS errors
        if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
            errorContainer.innerHTML = `
                <strong>Connection Error</strong>
                <p>Unable to connect to the API. This could be due to:</p>
                <ul style="text-align: left; display: inline-block; margin: 16px 0;">
                    <li><strong>Authentication required:</strong> You may need to sign in to your Google account first</li>
                    <li><strong>CORS configuration:</strong> The Apps Script may need to be redeployed</li>
                    <li><strong>Network issue:</strong> Check your internet connection</li>
                </ul>
                <p><strong>Try this first:</strong></p>
                <div style="margin-top: 16px;">
                    <a href="${CONFIG.API_URL}" target="_blank" class="btn-auth">
                        Open API & Authenticate
                    </a>
                </div>
                <p style="margin-top: 12px; font-size: 13px; color: #666;">
                    After authenticating in the new tab, return here and click "Retry" below.
                </p>
            `;
            return;
        }

        // Generic error
        errorContainer.innerHTML = `
            <strong>Error Loading Tasks</strong>
            <p>${error.message}</p>
            <p style="margin-top: 12px; font-size: 13px; color: #666;">
                If this error persists, you may need to authenticate with Google first.
            </p>
            <div style="margin-top: 16px;">
                <a href="${CONFIG.API_URL}" target="_blank" class="btn-auth">
                    Open API & Authenticate
                </a>
            </div>
        `;
    },

    /**
     * Render tab navigation
     */
    renderTabs() {
        const tabNav = document.getElementById('tabNav');
        tabNav.innerHTML = '';

        AppState.owners.forEach(owner => {
            const tab = document.createElement('button');
            tab.className = 'tab';
            tab.textContent = owner;
            tab.onclick = () => this.switchTab(owner);

            if (owner === AppState.currentTab) {
                tab.classList.add('active');
            }

            tabNav.appendChild(tab);
        });
    },

    /**
     * Switch to a different tab
     */
    switchTab(owner) {
        AppState.currentTab = owner;
        this.renderTabs();
        this.renderCurrentTab();
    },

    /**
     * Render the current active tab
     */
    renderCurrentTab() {
        const tabContent = document.getElementById('tabContent');

        if (AppState.currentTab === 'Summary') {
            tabContent.innerHTML = this.renderSummaryTab();
        } else {
            tabContent.innerHTML = this.renderOwnerTab(AppState.currentTab);
        }
    },

    /**
     * Render an owner's tab
     */
    renderOwnerTab(owner) {
        // Get tasks for this owner
        const ownerTasks = AppState.tasks.filter(task => task.owner === owner);

        // Get unique entities for this owner
        const entities = ['All', ...new Set(ownerTasks.map(t => t.entity).filter(Boolean))];

        // Filter by selected entity
        const selectedEntity = AppState.selectedEntity[owner] || 'All';
        const filteredTasks = selectedEntity === 'All'
            ? ownerTasks
            : ownerTasks.filter(t => t.entity === selectedEntity);

        // Calculate progress
        const completedCount = filteredTasks.filter(t => t.status === 'Complete').length;
        const totalCount = filteredTasks.length;
        const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        // Group tasks by area (preserving order of first appearance)
        const areaMap = new Map();
        filteredTasks.forEach(task => {
            const area = task.area || 'Other';
            if (!areaMap.has(area)) {
                areaMap.set(area, []);
            }
            areaMap.get(area).push(task);
        });

        // Build HTML
        let html = '<div class="tab-content active">';

        // Progress bar
        html += `
            <div class="progress-section">
                <div class="progress-text">${completedCount} of ${totalCount} tasks complete</div>
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: ${progressPercent}%">
                        ${progressPercent > 10 ? progressPercent + '%' : ''}
                    </div>
                </div>
            </div>
        `;

        // Entity filter
        if (entities.length > 1) {
            html += '<div class="entity-filter">';
            html += '<span class="entity-filter-label">Filter by Entity</span>';
            html += '<div class="entity-pills">';
            entities.forEach(entity => {
                const isActive = entity === selectedEntity ? 'active' : '';
                html += `<button class="entity-pill ${isActive}" onclick="App.filterByEntity('${owner}', '${entity}')">${entity}</button>`;
            });
            html += '</div></div>';
        }

        // Area groups
        if (areaMap.size === 0) {
            html += '<p style="text-align: center; padding: 40px; color: #999;">No tasks found</p>';
        }

        areaMap.forEach((tasks, area) => {
            html += `<div class="area-group">`;
            html += `<h2 class="area-header">${area}</h2>`;
            html += `<div class="task-list">`;

            tasks.forEach(task => {
                html += this.renderTaskCard(task);
            });

            html += `</div></div>`;
        });

        html += '</div>';
        return html;
    },

    /**
     * Render a single task card
     */
    renderTaskCard(task) {
        const isComplete = task.status === 'Complete';
        const bdStatus = this.calculateBDStatus(task.businessDayDue);

        let html = `<div class="task-card ${isComplete ? 'completed' : ''}" data-task-id="${task.taskId}">`;

        // Header with task name and checkmark
        html += '<div class="task-card-header">';
        html += `<div class="task-name">${task.taskName}</div>`;
        if (isComplete) {
            html += '<span class="task-checkmark">✓</span>';
        }
        html += '</div>';

        // Description
        if (task.description) {
            html += `<div class="task-description">${task.description}</div>`;
        }

        // Badges
        html += '<div class="task-badges">';

        // Entity badge
        if (task.entity) {
            const entityColor = CONFIG.ENTITY_COLORS[task.entity] || '#999999';
            html += `<span class="badge entity-badge" style="background-color: ${entityColor}">${task.entity}</span>`;
        }

        // Business day badge
        if (task.businessDayDue !== null && task.businessDayDue !== undefined && task.businessDayDue !== '') {
            html += `<span class="badge bd-badge ${bdStatus.class}">BD+${task.businessDayDue}</span>`;
        }

        html += '</div>';

        // Status dropdown
        html += `<select class="task-status-select" onchange="App.handleStatusChange('${task.taskId}', this.value)" ${isComplete ? '' : ''}>`;
        CONFIG.STATUSES.forEach(status => {
            const selected = status === task.status ? 'selected' : '';
            html += `<option value="${status}" ${selected}>${status}</option>`;
        });
        html += '</select>';

        // Completion info
        if (isComplete && task.completedBy) {
            const completedDate = task.completedAt ? new Date(task.completedAt).toLocaleString() : '';
            html += `<div class="task-completion-info">Completed by ${task.completedBy}${completedDate ? ' on ' + completedDate : ''}</div>`;
        }

        // Notes
        if (task.notes) {
            html += `<div class="task-notes"><div class="task-notes-label">Notes:</div>${task.notes}</div>`;
        }

        html += '</div>';
        return html;
    },

    /**
     * Calculate business day status
     */
    calculateBDStatus(businessDayDue) {
        if (businessDayDue === null || businessDayDue === undefined || businessDayDue === '') {
            return { class: 'on-track', label: 'N/A' };
        }

        const monthEnd = new Date(AppState.selectedYear, AppState.selectedMonth + 1, 0);
        const targetDate = this.addBusinessDays(monthEnd, parseInt(businessDayDue));
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor((targetDate - today) / (1000 * 60 * 60 * 24));

        if (daysDiff < 0) {
            return { class: 'overdue', label: 'Overdue' };
        } else if (daysDiff === 0) {
            return { class: 'due-today', label: 'Due Today' };
        } else {
            return { class: 'on-track', label: 'On Track' };
        }
    },

    /**
     * Add business days to a date (skipping weekends and federal holidays)
     */
    addBusinessDays(startDate, days) {
        const date = new Date(startDate);
        let addedDays = 0;

        while (addedDays < days) {
            date.setDate(date.getDate() + 1);

            // Skip weekends
            if (date.getDay() === 0 || date.getDay() === 6) {
                continue;
            }

            // Skip federal holidays
            const dateStr = date.toISOString().split('T')[0];
            if (CONFIG.FEDERAL_HOLIDAYS_2026.includes(dateStr)) {
                continue;
            }

            addedDays++;
        }

        return date;
    },

    /**
     * Filter tasks by entity
     */
    filterByEntity(owner, entity) {
        AppState.selectedEntity[owner] = entity;
        this.renderCurrentTab();
    },

    /**
     * Handle status change on a task
     */
    handleStatusChange(taskId, newStatus) {
        const task = AppState.tasks.find(t => t.taskId === taskId);

        if (!task) {
            alert('Task not found');
            return;
        }

        if (newStatus === 'Complete') {
            // Show modal to get completer name
            AppState.pendingCompleteTask = { taskId, newStatus };
            document.getElementById('completerModal').style.display = 'flex';
            document.getElementById('completerNameInput').value = '';
            document.getElementById('completerNameInput').focus();
        } else {
            // Update immediately for non-complete statuses
            this.updateTaskStatus(taskId, newStatus, '', '');
        }
    },

    /**
     * Confirm completion with name
     */
    confirmComplete() {
        const completerName = document.getElementById('completerNameInput').value.trim();

        if (!completerName) {
            alert('Please enter your name');
            return;
        }

        const { taskId, newStatus } = AppState.pendingCompleteTask;
        this.updateTaskStatus(taskId, newStatus, completerName, '');

        // Close modal
        document.getElementById('completerModal').style.display = 'none';
        AppState.pendingCompleteTask = null;
    },

    /**
     * Cancel completion
     */
    cancelComplete() {
        document.getElementById('completerModal').style.display = 'none';
        AppState.pendingCompleteTask = null;

        // Reset the dropdown
        this.loadTasks();
    },

    /**
     * Update task status via API
     */
    async updateTaskStatus(taskId, status, completedBy, notes) {
        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                mode: 'cors',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'updateTask',
                    taskId: taskId,
                    status: status,
                    completedBy: completedBy,
                    notes: notes
                })
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error('Authentication required. Please refresh the page and authenticate with Google.');
                }
                throw new Error(`Server error: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to update task');
            }

            // Reload tasks to reflect changes
            await this.loadTasks();

        } catch (error) {
            console.error('Error updating task:', error);

            // Show user-friendly error
            if (error.message.includes('Authentication required')) {
                alert(error.message + '\n\nClick OK, then authenticate by opening the API URL in a new tab.');
                window.open(CONFIG.API_URL, '_blank');
            } else {
                alert('Failed to update task: ' + error.message);
            }

            this.loadTasks(); // Reload to reset UI
        }
    },

    /**
     * Filter summary by entity
     */
    filterSummaryByEntity(entity) {
        AppState.summaryEntityFilter = entity;
        this.renderCurrentTab();
    },

    /**
     * Get initial from name
     */
    getInitial(name) {
        if (!name) return '?';
        return name.charAt(0).toUpperCase();
    },

    /**
     * Calculate days until due or overdue
     */
    calculateDaysUntilDue(businessDayDue) {
        if (businessDayDue === null || businessDayDue === undefined || businessDayDue === '') {
            return null;
        }

        const monthEnd = new Date(AppState.selectedYear, AppState.selectedMonth + 1, 0);
        const targetDate = this.addBusinessDays(monthEnd, parseInt(businessDayDue));
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor((targetDate - today) / (1000 * 60 * 60 * 24));
        return daysDiff;
    },

    /**
     * Render Summary tab
     */
    renderSummaryTab() {
        // Apply entity filter
        const filteredTasks = AppState.summaryEntityFilter === 'All'
            ? AppState.tasks
            : AppState.tasks.filter(t => t.entity === AppState.summaryEntityFilter);

        const totalTasks = filteredTasks.length;
        const completedTasks = filteredTasks.filter(t => t.status === 'Complete').length;
        const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Get all unique entities for filter
        const allEntities = ['All', ...new Set(AppState.tasks.map(t => t.entity).filter(Boolean))];

        // Group by owner (excluding 'Summary')
        const ownerStats = [];
        AppState.owners.filter(o => o !== 'Summary').forEach(owner => {
            const ownerTasks = filteredTasks.filter(t => t.owner === owner);
            if (ownerTasks.length === 0) return; // Skip owners with no tasks in filtered view

            const completed = ownerTasks.filter(t => t.status === 'Complete').length;
            const inProgress = ownerTasks.filter(t => t.status === 'In Progress').length;
            const overdue = ownerTasks.filter(task => {
                if (task.status === 'Complete') return false;
                const bdStatus = this.calculateBDStatus(task.businessDayDue);
                return bdStatus.class === 'overdue';
            }).length;

            ownerStats.push({
                name: owner,
                total: ownerTasks.length,
                completed,
                inProgress,
                overdue,
                percent: ownerTasks.length > 0 ? Math.round((completed / ownerTasks.length) * 100) : 0
            });
        });

        // Get all open tasks
        const openTasks = filteredTasks
            .filter(t => t.status !== 'Complete')
            .map(t => ({
                ...t,
                daysUntilDue: this.calculateDaysUntilDue(t.businessDayDue)
            }))
            .sort((a, b) => {
                // Sort by BusinessDayDue ascending (nulls last)
                if (a.businessDayDue === null || a.businessDayDue === undefined || a.businessDayDue === '') return 1;
                if (b.businessDayDue === null || b.businessDayDue === undefined || b.businessDayDue === '') return -1;
                return a.businessDayDue - b.businessDayDue;
            });

        // Get audit log (last 20 completions)
        const completions = filteredTasks
            .filter(t => t.status === 'Complete' && t.completedAt)
            .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
            .slice(0, 20);

        // Build HTML
        let html = '<div class="tab-content active">';

        // Top-line progress
        html += `
            <div class="progress-section">
                <div class="progress-text">${completedTasks} of ${totalTasks} total tasks complete across the team</div>
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: ${completionPercent}%">
                        ${completionPercent > 10 ? completionPercent + '%' : ''}
                    </div>
                </div>
            </div>
        `;

        // Entity filter
        html += '<div class="entity-filter">';
        html += '<span class="entity-filter-label">Filter by Entity</span>';
        html += '<div class="entity-pills">';
        allEntities.forEach(entity => {
            const isActive = entity === AppState.summaryEntityFilter ? 'active' : '';
            html += `<button class="entity-pill ${isActive}" onclick="App.filterSummaryByEntity('${entity}')">${entity}</button>`;
        });
        html += '</div></div>';

        // Team member cards
        html += '<div class="area-group">';
        html += '<h2 class="area-header">Team Progress</h2>';
        html += '<div class="team-cards">';

        ownerStats.forEach(owner => {
            html += `
                <div class="team-card">
                    <div class="team-card-header">
                        <div class="avatar">${this.getInitial(owner.name)}</div>
                        <div class="team-card-info">
                            <div class="team-name">${owner.name}</div>
                            <div class="team-stats">
                                ${owner.inProgress > 0 ? `<span class="stat-badge in-progress">${owner.inProgress} in progress</span>` : ''}
                                ${owner.overdue > 0 ? `<span class="stat-badge overdue">${owner.overdue} overdue</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="team-progress">
                        <div class="team-progress-text">${owner.completed} of ${owner.total} complete</div>
                        <div class="progress-bar-container">
                            <div class="progress-bar-fill" style="width: ${owner.percent}%">
                                ${owner.percent > 10 ? owner.percent + '%' : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div></div>';

        // All open tasks table
        html += '<div class="area-group">';
        html += '<h2 class="area-header">All Open Tasks</h2>';

        if (openTasks.length === 0) {
            html += '<p style="text-align: center; padding: 40px; color: #999;">No open tasks</p>';
        } else {
            html += '<div class="table-container">';
            html += '<table class="open-tasks-table">';
            html += `
                <thead>
                    <tr>
                        <th>Task Name</th>
                        <th>Owner</th>
                        <th>Area</th>
                        <th>Entity</th>
                        <th>BD Due</th>
                        <th>Status</th>
                        <th>Due In</th>
                    </tr>
                </thead>
                <tbody>
            `;

            openTasks.forEach(task => {
                const daysText = this.formatDaysUntilDue(task.daysUntilDue);
                const daysClass = task.daysUntilDue !== null && task.daysUntilDue < 0 ? 'overdue-text' : '';

                html += `
                    <tr>
                        <td class="task-name-cell">${task.taskName}</td>
                        <td>${task.owner || '-'}</td>
                        <td>${task.area || '-'}</td>
                        <td><span class="entity-badge-small" style="background-color: ${CONFIG.ENTITY_COLORS[task.entity] || '#999'}">${task.entity || '-'}</span></td>
                        <td>BD+${task.businessDayDue !== null && task.businessDayDue !== undefined && task.businessDayDue !== '' ? task.businessDayDue : '-'}</td>
                        <td><span class="status-badge status-${task.status.toLowerCase().replace(' ', '-')}">${task.status}</span></td>
                        <td class="${daysClass}">${daysText}</td>
                    </tr>
                `;
            });

            html += '</tbody></table></div>';
        }

        html += '</div>';

        // Audit log
        html += '<div class="area-group">';
        html += '<h2 class="area-header">Recent Completions</h2>';

        if (completions.length === 0) {
            html += '<p style="text-align: center; padding: 40px; color: #999;">No completions yet</p>';
        } else {
            html += '<div class="audit-log">';

            completions.forEach(task => {
                const timestamp = new Date(task.completedAt).toLocaleString();
                html += `
                    <div class="audit-entry">
                        <span class="audit-icon">✓</span>
                        <span class="audit-text">
                            <strong>${task.completedBy}</strong> completed
                            <strong>${task.taskName}</strong>
                            ${task.entity ? `(<span class="entity-badge-inline" style="background-color: ${CONFIG.ENTITY_COLORS[task.entity] || '#999'}">${task.entity}</span>)` : ''}
                            at ${timestamp}
                        </span>
                    </div>
                `;
            });

            html += '</div>';
        }

        html += '</div>';
        html += '</div>';

        return html;
    },

    /**
     * Format days until due text
     */
    formatDaysUntilDue(days) {
        if (days === null) return 'N/A';
        if (days < 0) return `${Math.abs(days)} days overdue`;
        if (days === 0) return 'Due today';
        if (days === 1) return '1 day';
        return `${days} days`;
    }
};

// ===== Initialize on page load =====
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
