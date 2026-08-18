/* ==========================================================================
   TaskPulse Todo App Dashboard - Vanilla JavaScript Engine
   Uses WebStorage (localStorage) for complete data persistence
   ========================================================================== */

const STORAGE_KEY = 'taskpulse_dashboard_tasks_v1';

// Initial Sample Data for Instant Dashboard Display
const SAMPLE_TASKS = [
    {
        id: 'task-101',
        title: 'Design API Authentication Architecture',
        description: 'Implement JWT tokens, refresh tokens rotation, and rate-limiting security headers.',
        category: 'Coding',
        priority: 'High',
        dueDate: getFormattedDate(0), // Today
        completed: false,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        subtasks: [
            { id: 'sub-1', text: 'Draft OAuth2 spec document', completed: true },
            { id: 'sub-2', text: 'Configure Redis session storage', completed: true },
            { id: 'sub-3', text: 'Write integration test suite', completed: false }
        ]
    },
    {
        id: 'task-102',
        title: 'Quarterly Team Performance Review',
        description: 'Prepare individual KPI summaries and feedback deck for the upcoming engineering sync.',
        category: 'Work',
        priority: 'High',
        dueDate: getFormattedDate(1), // Tomorrow
        completed: false,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        subtasks: [
            { id: 'sub-4', text: 'Collect peer review forms', completed: true },
            { id: 'sub-5', text: 'Draft promotion recommendations', completed: false }
        ]
    },
    {
        id: 'task-103',
        title: 'Morning Yoga & 5K HIIT Run',
        description: 'Maintain daily cardiovascular fitness goal and mindfulness routine.',
        category: 'Health',
        priority: 'Medium',
        dueDate: getFormattedDate(0), // Today
        completed: true,
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        subtasks: [
            { id: 'sub-6', text: '15 min hydration & stretch', completed: true },
            { id: 'sub-7', text: 'Run 5km outdoor trail', completed: true }
        ]
    },
    {
        id: 'task-104',
        title: 'Monthly Budget & Investment Rebalance',
        description: 'Review index funds distribution, savings target, and track expense report.',
        category: 'Finance',
        priority: 'Medium',
        dueDate: getFormattedDate(3),
        completed: false,
        createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
        subtasks: [
            { id: 'sub-8', text: 'Download credit card statement', completed: true },
            { id: 'sub-9', text: 'Allocate automated savings pool', completed: false }
        ]
    },
    {
        id: 'task-105',
        title: 'Organize Home Office Workspace',
        description: 'Cable management under standing desk, dust monitors, and setup ergonomical chair.',
        category: 'Personal',
        priority: 'Low',
        dueDate: getFormattedDate(5),
        completed: true,
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        subtasks: [
            { id: 'sub-10', text: 'Order cable sleeves online', completed: true },
            { id: 'sub-11', text: 'Clean dual monitor arm setup', completed: true }
        ]
    }
];

// Application State
const state = {
    tasks: [],
    activeNav: 'all', // 'all', 'today', 'pending', 'completed', or category name e.g. 'cat_Work'
    categoryFilter: 'all',
    priorityFilter: 'all',
    sortBy: 'dueDate', // 'dueDate', 'priority', 'created', 'alphabetical'
    searchQuery: '',
    viewMode: 'grid', // 'grid' | 'list'
    builderSubtasks: [] // Temporary subtasks array during creation/edit modal
};

// Helper: Get YYYY-MM-DD date string with offset
function getFormattedDate(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
}

// Helper: Generate Unique ID
function generateId(prefix = 'task') {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/* --------------------------------------------------------------------------
   1. Initialization & LocalStorage Persistence
   -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    loadFromStorage();
    updateDateDisplay();
    renderApp();
    setupEventListeners();
}

function loadFromStorage() {
    try {
        const rawData = localStorage.getItem(STORAGE_KEY);
        if (rawData) {
            state.tasks = JSON.parse(rawData);
            updateStorageIndicator(true);
        } else {
            // Seed sample tasks on first launch
            state.tasks = [...SAMPLE_TASKS];
            saveToStorage();
            showToast('Welcome! Loaded demo tasks into WebStorage.', 'info');
        }
    } catch (e) {
        console.error('Failed to load tasks from localStorage:', e);
        state.tasks = [...SAMPLE_TASKS];
        updateStorageIndicator(false);
    }
}

function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
        updateStorageIndicator(true);
    } catch (e) {
        console.error('Failed to save to localStorage:', e);
        showToast('Warning: WebStorage quota exceeded or disabled', 'warning');
        updateStorageIndicator(false);
    }
}

function updateStorageIndicator(isActive) {
    const statusEl = document.getElementById('storage-status');
    const fillEl = document.getElementById('storage-fill');
    if (statusEl && fillEl) {
        statusEl.textContent = isActive ? 'Active' : 'Offline';
        statusEl.style.color = isActive ? '#34d399' : '#f87171';
        fillEl.style.background = isActive 
            ? 'linear-gradient(90deg, #10b981 0%, #6366f1 100%)' 
            : '#f87171';
    }
}

function resetToSampleData() {
    if (confirm('Are you sure you want to reset all tasks to the original demo data?')) {
        state.tasks = JSON.parse(JSON.stringify(SAMPLE_TASKS));
        saveToStorage();
        renderApp();
        showToast('Tasks reset to default demo dataset!', 'success');
    }
}

/* --------------------------------------------------------------------------
   2. Main Rendering Engine
   -------------------------------------------------------------------------- */
function renderApp() {
    renderMetrics();
    renderCategoryDistributionBar();
    renderSidebarCategories();
    renderSidebarCounts();
    renderTasks();
}

function updateDateDisplay() {
    const el = document.getElementById('current-date-display');
    if (el) {
        const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
        el.textContent = `Today is ${new Date().toLocaleDateString('en-US', options)}`;
    }
}

/* Metrics & Progress Ring Calculations */
function renderMetrics() {
    const total = state.tasks.length;
    const completed = state.tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const highPriorityCount = state.tasks.filter(t => !t.completed && t.priority === 'High').length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Update Text Elements
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-total-sub').textContent = `${total} tasks total`;

    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('stat-pending-sub').textContent = `${highPriorityCount} high priority`;

    document.getElementById('stat-completed').textContent = completed;
    document.getElementById('stat-completed-sub').textContent = `${percentage}% productivity score`;

    document.getElementById('stat-score-text').textContent = `${percentage}% Done`;
    document.getElementById('stat-percentage').textContent = `${percentage}%`;

    // SVG Circular Progress Ring Update (r=28, Circumference = 2 * PI * 28 = 175.929)
    const ringCircle = document.getElementById('productivity-ring');
    if (ringCircle) {
        const circumference = 175.929;
        const offset = circumference - (percentage / 100) * circumference;
        ringCircle.style.strokeDashoffset = offset;
    }
}

/* Visual Category Breakdown Bar */
function renderCategoryDistributionBar() {
    const container = document.getElementById('category-segment-bar');
    if (!container) return;

    container.innerHTML = '';
    const total = state.tasks.length;
    if (total === 0) return;

    const categories = ['Work', 'Personal', 'Coding', 'Health', 'Finance'];
    const catClassMap = {
        'Work': 'cat-work',
        'Personal': 'cat-personal',
        'Coding': 'cat-coding',
        'Health': 'cat-health',
        'Finance': 'cat-finance'
    };

    categories.forEach(cat => {
        const count = state.tasks.filter(t => t.category === cat).length;
        if (count > 0) {
            const pct = (count / total) * 100;
            const segment = document.createElement('div');
            segment.className = `category-segment ${catClassMap[cat] || 'cat-work'}`;
            segment.style.width = `${pct}%`;
            segment.title = `${cat}: ${count} tasks (${Math.round(pct)}%)`;
            container.appendChild(segment);
        }
    });
}

/* Sidebar Dynamic Category Counts */
function renderSidebarCategories() {
    const container = document.getElementById('sidebar-categories');
    if (!container) return;

    const categories = [
        { name: 'Work', emoji: '💼', color: '#3b82f6' },
        { name: 'Personal', emoji: '🏠', color: '#ec4899' },
        { name: 'Coding', emoji: '💻', color: '#8b5cf6' },
        { name: 'Health', emoji: '🧘', color: '#10b981' },
        { name: 'Finance', emoji: '💰', color: '#f59e0b' }
    ];

    container.innerHTML = categories.map(cat => {
        const count = state.tasks.filter(t => t.category === cat.name).length;
        const isActive = state.activeNav === `cat_${cat.name}`;
        return `
            <div class="sidebar-category-item ${isActive ? 'active' : ''}" onclick="switchNav('cat_${cat.name}')">
                <span>
                    <span class="category-dot" style="background: ${cat.color};"></span>
                    ${cat.emoji} ${cat.name}
                </span>
                <span class="nav-count">${count}</span>
            </div>
        `;
    }).join('');
}

function renderSidebarCounts() {
    const todayStr = getFormattedDate(0);
    document.getElementById('nav-count-all').textContent = state.tasks.length;
    document.getElementById('nav-count-today').textContent = state.tasks.filter(t => t.dueDate === todayStr && !t.completed).length;
    document.getElementById('nav-count-pending').textContent = state.tasks.filter(t => !t.completed).length;
    document.getElementById('nav-count-completed').textContent = state.tasks.filter(t => t.completed).length;
}

/* --------------------------------------------------------------------------
   3. Task Filtering, Sorting & Card Renderer
   -------------------------------------------------------------------------- */
function getFilteredAndSortedTasks() {
    const todayStr = getFormattedDate(0);

    return state.tasks.filter(task => {
        // Nav Filter
        if (state.activeNav === 'today' && (task.dueDate !== todayStr || task.completed)) return false;
        if (state.activeNav === 'pending' && task.completed) return false;
        if (state.activeNav === 'completed' && !task.completed) return false;
        if (state.activeNav.startsWith('cat_')) {
            const catName = state.activeNav.replace('cat_', '');
            if (task.category !== catName) return false;
        }

        // Toolbar Category Filter
        if (state.categoryFilter !== 'all' && task.category !== state.categoryFilter) return false;

        // Toolbar Priority Filter
        if (state.priorityFilter !== 'all' && task.priority !== state.priorityFilter) return false;

        // Toolbar Search Query
        if (state.searchQuery) {
            const q = state.searchQuery.toLowerCase();
            const matchTitle = task.title.toLowerCase().includes(q);
            const matchDesc = task.description ? task.description.toLowerCase().includes(q) : false;
            const matchCat = task.category.toLowerCase().includes(q);
            if (!matchTitle && !matchDesc && !matchCat) return false;
        }

        return true;
    }).sort((a, b) => {
        // Sorting Logic
        if (state.sortBy === 'dueDate') {
            return new Date(a.dueDate) - new Date(b.dueDate);
        } else if (state.sortBy === 'priority') {
            const prioWeight = { 'High': 1, 'Medium': 2, 'Low': 3 };
            return prioWeight[a.priority] - prioWeight[b.priority];
        } else if (state.sortBy === 'created') {
            return new Date(b.createdAt) - new Date(a.createdAt);
        } else if (state.sortBy === 'alphabetical') {
            return a.title.localeCompare(b.title);
        }
        return 0;
    });
}

function renderTasks() {
    const container = document.getElementById('tasks-container');
    const emptyState = document.getElementById('empty-state');
    if (!container) return;

    const filteredTasks = getFilteredAndSortedTasks();

    if (filteredTasks.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';
    container.className = `${state.viewMode}-mode`;

    container.innerHTML = filteredTasks.map(task => createTaskCardHTML(task)).join('');
}

function createTaskCardHTML(task) {
    const todayStr = getFormattedDate(0);
    const isOverdue = task.dueDate < todayStr && !task.completed;
    const isToday = task.dueDate === todayStr && !task.completed;

    // Due Date Badge Text & Class
    let dueDateClass = 'due-date-pill';
    if (isOverdue) dueDateClass += ' overdue';
    else if (isToday) dueDateClass += ' today';

    const formattedDueDate = formatDateHuman(task.dueDate);

    // Subtasks Stats
    const totalSubtasks = task.subtasks ? task.subtasks.length : 0;
    const completedSubtasks = task.subtasks ? task.subtasks.filter(s => s.completed).length : 0;
    const subtaskPct = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

    const categoryBadgeClass = `badge-${task.category.toLowerCase()}`;
    const priorityBadgeClass = `priority-${task.priority.toLowerCase()}`;

    return `
        <article class="task-card ${task.completed ? 'completed' : ''}" id="task-card-${task.id}">
            <!-- Header Badges -->
            <div class="task-header">
                <div class="task-badges">
                    <span class="badge ${categoryBadgeClass}">${getCategoryEmoji(task.category)} ${task.category}</span>
                    <span class="badge ${priorityBadgeClass}">${task.priority} Priority</span>
                </div>
                <div class="task-actions">
                    <button class="action-icon-btn" onclick="openTaskModal('${task.id}')" title="Edit Task">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="action-icon-btn delete" onclick="deleteTask('${task.id}')" title="Delete Task">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>

            <!-- Task Title & Checkbox -->
            <div class="task-title-group">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTaskComplete('${task.id}')" aria-label="Mark task as complete">
                <div>
                    <h3 class="task-title">${escapeHTML(task.title)}</h3>
                </div>
            </div>

            <!-- Task Description -->
            ${task.description ? `<p class="task-desc">${escapeHTML(task.description)}</p>` : ''}

            <!-- Subtasks / Checklist -->
            ${totalSubtasks > 0 ? `
                <div class="task-subtasks-wrapper">
                    <div class="subtask-progress-header">
                        <span>Checklist</span>
                        <span>${completedSubtasks}/${totalSubtasks} (${subtaskPct}%)</span>
                    </div>
                    <div class="subtask-progress-track">
                        <div class="subtask-progress-fill" style="width: ${subtaskPct}%"></div>
                    </div>
                    <ul class="subtasks-list">
                        ${task.subtasks.map(s => `
                            <li class="subtask-item ${s.completed ? 'checked' : ''}" onclick="toggleSubtaskComplete('${task.id}', '${s.id}')">
                                <input type="checkbox" class="subtask-checkbox" ${s.completed ? 'checked' : ''} onclick="event.stopPropagation(); toggleSubtaskComplete('${task.id}', '${s.id}')">
                                <span>${escapeHTML(s.text)}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}

            <!-- Task Footer -->
            <div class="task-footer">
                <div class="${dueDateClass}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span>${isOverdue ? 'Overdue: ' : ''}${formattedDueDate}</span>
                </div>
            </div>
        </article>
    `;
}

/* Helpers */
function getCategoryEmoji(cat) {
    const map = { Work: '💼', Personal: '🏠', Coding: '💻', Health: '🧘', Finance: '💰' };
    return map[cat] || '📋';
}

function formatDateHuman(dateStr) {
    if (!dateStr) return '';
    const todayStr = getFormattedDate(0);
    const tomorrowStr = getFormattedDate(1);
    if (dateStr === todayStr) return 'Today';
    if (dateStr === tomorrowStr) return 'Tomorrow';
    
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
        return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return dateStr;
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

/* --------------------------------------------------------------------------
   4. User Action Handlers (Task CRUD & Interactive Toggles)
   -------------------------------------------------------------------------- */
function toggleTaskComplete(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        saveToStorage();
        renderApp();
        showToast(task.completed ? 'Task completed! 🎉' : 'Task marked pending', 'success');
    }
}

function toggleSubtaskComplete(taskId, subtaskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (task && task.subtasks) {
        const sub = task.subtasks.find(s => s.id === subtaskId);
        if (sub) {
            sub.completed = !sub.completed;
            // If all subtasks completed, auto offer or complete
            const allDone = task.subtasks.every(s => s.completed);
            if (allDone && !task.completed) {
                task.completed = true;
                showToast('All checklist items finished! Task marked complete.', 'success');
            }
            saveToStorage();
            renderApp();
        }
    }
}

function deleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
        state.tasks = state.tasks.filter(t => t.id !== taskId);
        saveToStorage();
        renderApp();
        showToast('Task deleted', 'info');
    }
}

function clearCompletedTasks() {
    const completedCount = state.tasks.filter(t => t.completed).length;
    if (completedCount === 0) {
        showToast('No completed tasks to clear', 'info');
        return;
    }
    if (confirm(`Remove ${completedCount} completed task(s)?`)) {
        state.tasks = state.tasks.filter(t => !t.completed);
        saveToStorage();
        renderApp();
        showToast(`Cleared ${completedCount} completed task(s)`, 'success');
    }
}

/* --------------------------------------------------------------------------
   5. Modal & Subtask Builder Engine
   -------------------------------------------------------------------------- */
function openTaskModal(editTaskId = null) {
    const modal = document.getElementById('task-modal');
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('task-form');

    form.reset();
    state.builderSubtasks = [];

    if (editTaskId) {
        const task = state.tasks.find(t => t.id === editTaskId);
        if (task) {
            modalTitle.textContent = 'Edit Task';
            document.getElementById('task-id').value = task.id;
            document.getElementById('task-title-input').value = task.title;
            document.getElementById('task-desc-input').value = task.description || '';
            document.getElementById('task-category-select').value = task.category;
            document.getElementById('task-priority-select').value = task.priority;
            document.getElementById('task-duedate-input').value = task.dueDate;
            state.builderSubtasks = task.subtasks ? JSON.parse(JSON.stringify(task.subtasks)) : [];
        }
    } else {
        modalTitle.textContent = 'Create New Task';
        document.getElementById('task-id').value = '';
        document.getElementById('task-duedate-input').value = getFormattedDate(0); // default today
    }

    renderBuilderSubtasks();
    modal.classList.add('active');
    document.getElementById('task-title-input').focus();
}

function closeTaskModal() {
    const modal = document.getElementById('task-modal');
    modal.classList.remove('active');
}

function closeModalOnBackdrop(e) {
    if (e.target.classList.contains('modal-overlay')) {
        closeTaskModal();
    }
}

function handleAddSubtaskKey(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        addSubtaskFromInput();
    }
}

function addSubtaskFromInput() {
    const input = document.getElementById('subtask-builder-input');
    const text = input.value.trim();
    if (text) {
        state.builderSubtasks.push({
            id: generateId('sub'),
            text: text,
            completed: false
        });
        input.value = '';
        renderBuilderSubtasks();
    }
}

function removeBuilderSubtask(index) {
    state.builderSubtasks.splice(index, 1);
    renderBuilderSubtasks();
}

function renderBuilderSubtasks() {
    const list = document.getElementById('subtask-builder-list');
    if (!list) return;

    list.innerHTML = state.builderSubtasks.map((sub, idx) => `
        <li class="subtask-builder-item">
            <span>• ${escapeHTML(sub.text)}</span>
            <button type="button" onclick="removeBuilderSubtask(${idx})">✕</button>
        </li>
    `).join('');
}

function handleFormSubmit(e) {
    e.preventDefault();
    const taskId = document.getElementById('task-id').value;
    const title = document.getElementById('task-title-input').value.trim();
    const description = document.getElementById('task-desc-input').value.trim();
    const category = document.getElementById('task-category-select').value;
    const priority = document.getElementById('task-priority-select').value;
    const dueDate = document.getElementById('task-duedate-input').value;

    if (!title || !dueDate) {
        showToast('Please fill out required fields', 'warning');
        return;
    }

    if (taskId) {
        // Edit existing task
        const task = state.tasks.find(t => t.id === taskId);
        if (task) {
            task.title = title;
            task.description = description;
            task.category = category;
            task.priority = priority;
            task.dueDate = dueDate;
            task.subtasks = [...state.builderSubtasks];
            showToast('Task updated successfully!', 'success');
        }
    } else {
        // Create new task
        const newTask = {
            id: generateId('task'),
            title: title,
            description: description,
            category: category,
            priority: priority,
            dueDate: dueDate,
            completed: false,
            createdAt: new Date().toISOString(),
            subtasks: [...state.builderSubtasks]
        };
        state.tasks.unshift(newTask);
        showToast('New task created!', 'success');
    }

    saveToStorage();
    closeTaskModal();
    renderApp();
}

/* --------------------------------------------------------------------------
   6. Navigation, Filtering & View Handlers
   -------------------------------------------------------------------------- */
function switchNav(navId) {
    state.activeNav = navId;

    // Update active UI classes
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if (navId === 'all') document.getElementById('nav-all-tasks')?.classList.add('active');
    else if (navId === 'today') document.getElementById('nav-today-tasks')?.classList.add('active');
    else if (navId === 'pending') document.getElementById('nav-pending-tasks')?.classList.add('active');
    else if (navId === 'completed') document.getElementById('nav-completed-tasks')?.classList.add('active');

    renderApp();
}

function handleSearchInput(e) {
    state.searchQuery = e.target.value;
    const clearBtn = document.getElementById('btn-clear-search');
    if (clearBtn) {
        clearBtn.style.display = state.searchQuery ? 'block' : 'none';
    }
    renderTasks();
}

function clearSearch() {
    state.searchQuery = '';
    const input = document.getElementById('search-input');
    if (input) input.value = '';
    document.getElementById('btn-clear-search').style.display = 'none';
    renderTasks();
}

function handleCategoryFilter(e) {
    state.categoryFilter = e.target.value;
    renderTasks();
}

function handlePriorityFilter(e) {
    state.priorityFilter = e.target.value;
    renderTasks();
}

function handleSortChange(e) {
    state.sortBy = e.target.value;
    renderTasks();
}

function setViewMode(mode) {
    state.viewMode = mode;
    document.getElementById('view-grid').classList.toggle('active', mode === 'grid');
    document.getElementById('view-list').classList.toggle('active', mode === 'list');
    renderTasks();
}

function setupEventListeners() {
    // Escape Key closes modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeTaskModal();
        }
    });
}

/* --------------------------------------------------------------------------
   7. Toast Notification Engine
   -------------------------------------------------------------------------- */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const iconMap = {
        success: '✓',
        info: 'ℹ',
        warning: '⚠'
    };

    toast.innerHTML = `
        <span>${iconMap[type] || '•'}</span>
        <span>${escapeHTML(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.25s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
