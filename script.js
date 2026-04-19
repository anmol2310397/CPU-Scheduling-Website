// CPU Scheduling Simulator - Main JavaScript File

class CPUSchedulingSimulator {
    constructor() {
        this.processes = [];
        this.results = null;
        this.editingIndex = null;
        this.processColors = [
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#f7dc6f', '#bb8fce',
            '#85c88a', '#f8b500', '#6c5ce7', '#00b894', '#fd79a8'
        ];
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadDarkMode();
        this.updateProcessTable();
    }

    bindEvents() {
        // Form submission
        document.getElementById('processForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleProcessSubmit();
        });

        // Algorithm selection
        document.getElementById('algorithmSelect').addEventListener('change', (e) => {
            this.toggleTimeQuantum(e.target.value);
        });

        // Run algorithm button
        document.getElementById('runAlgorithm').addEventListener('click', () => {
            this.runSelectedAlgorithm();
        });

        // Clear all button
        document.getElementById('clearAll').addEventListener('click', () => {
            this.clearAll();
        });

        // Dark mode toggle
        document.getElementById('darkModeToggle').addEventListener('click', () => {
            this.toggleDarkMode();
        });
    }

    // Process Management Functions
    handleProcessSubmit() {
        const formData = new FormData(document.getElementById('processForm'));
        const process = {
            id: formData.get('processId').trim(),
            arrivalTime: parseInt(formData.get('arrivalTime')),
            burstTime: parseInt(formData.get('burstTime')),
            priority: formData.get('priority') ? parseInt(formData.get('priority')) : null
        };

        // Validation
        if (!this.validateProcess(process)) {
            return;
        }

        if (this.editingIndex !== null) {
            // Update existing process
            this.processes[this.editingIndex] = process;
            this.editingIndex = null;
            this.showToast('Process updated successfully', 'success');
        } else {
            // Check for duplicate ID
            if (this.processes.some(p => p.id === process.id)) {
                this.showToast('Process ID already exists', 'error');
                return;
            }
            this.processes.push(process);
            this.showToast('Process added successfully', 'success');
        }

        this.resetForm();
        this.updateProcessTable();
    }

    validateProcess(process) {
        if (!process.id) {
            this.showToast('Process ID is required', 'error');
            return false;
        }

        if (isNaN(process.arrivalTime) || process.arrivalTime < 0) {
            this.showToast('Arrival time must be a non-negative number', 'error');
            return false;
        }

        if (isNaN(process.burstTime) || process.burstTime <= 0) {
            this.showToast('Burst time must be a positive number', 'error');
            return false;
        }

        if (process.priority !== null && (isNaN(process.priority) || process.priority < 1)) {
            this.showToast('Priority must be a positive number', 'error');
            return false;
        }

        return true;
    }

    editProcess(index) {
        const process = this.processes[index];
        document.getElementById('processId').value = process.id;
        document.getElementById('arrivalTime').value = process.arrivalTime;
        document.getElementById('burstTime').value = process.burstTime;
        document.getElementById('priority').value = process.priority || '';
        
        this.editingIndex = index;
        document.querySelector('.process-form button[type="submit"]').textContent = 'Update Process';
        this.showToast('Edit the process details and click Update', 'info');
    }

    deleteProcess(index) {
        this.processes.splice(index, 1);
        this.updateProcessTable();
        this.showToast('Process deleted successfully', 'success');
        
        // Hide results if no processes left
        if (this.processes.length === 0) {
            document.getElementById('resultsSection').style.display = 'none';
        }
    }

    resetForm() {
        document.getElementById('processForm').reset();
        document.querySelector('.process-form button[type="submit"]').textContent = 'Add Process';
        this.editingIndex = null;
    }

    updateProcessTable() {
        const tbody = document.getElementById('processTableBody');
        const emptyState = document.getElementById('emptyState');
        const table = document.getElementById('processTable');

        if (this.processes.length === 0) {
            table.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        table.style.display = 'table';
        emptyState.style.display = 'none';

        tbody.innerHTML = '';
        this.processes.forEach((process, index) => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${process.id}</td>
                <td>${process.arrivalTime}</td>
                <td>${process.burstTime}</td>
                <td>${process.priority !== null ? process.priority : '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-edit" onclick="simulator.editProcess(${index})">Edit</button>
                        <button class="btn btn-sm btn-delete" onclick="simulator.deleteProcess(${index})">Delete</button>
                    </div>
                </td>
            `;
        });
    }

    // Algorithm Functions
    toggleTimeQuantum(algorithm) {
        const timeQuantumGroup = document.getElementById('timeQuantumGroup');
        if (algorithm === 'roundRobin') {
            timeQuantumGroup.style.display = 'flex';
        } else {
            timeQuantumGroup.style.display = 'none';
        }
    }

    runSelectedAlgorithm() {
        if (this.processes.length === 0) {
            this.showToast('Please add at least one process', 'error');
            return;
        }

        const algorithm = document.getElementById('algorithmSelect').value;
        let timeQuantum = null;

        if (algorithm === 'roundRobin') {
            timeQuantum = parseInt(document.getElementById('timeQuantum').value);
            if (isNaN(timeQuantum) || timeQuantum <= 0) {
                this.showToast('Please enter a valid time quantum', 'error');
                return;
            }
        }

        // Create deep copy of processes for simulation
        const processesCopy = this.processes.map(p => ({ ...p }));

        switch (algorithm) {
            case 'fcfs':
                this.results = this.fcfs(processesCopy);
                break;
            case 'sjf':
                this.results = this.sjf(processesCopy);
                break;
            case 'srtf':
                this.results = this.srtf(processesCopy);
                break;
            case 'priorityNP':
                this.results = this.priorityNonPreemptive(processesCopy);
                break;
            case 'priorityP':
                this.results = this.priorityPreemptive(processesCopy);
                break;
            case 'roundRobin':
                this.results = this.roundRobin(processesCopy, timeQuantum);
                break;
        }

        this.displayResults();
        this.showToast('Algorithm executed successfully', 'success');
    }

    // FCFS Algorithm
    fcfs(processes) {
        const sortedProcesses = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
        const ganttChart = [];
        let currentTime = 0;

        const results = sortedProcesses.map(process => {
            const startTime = Math.max(currentTime, process.arrivalTime);
            const endTime = startTime + process.burstTime;
            const waitingTime = startTime - process.arrivalTime;
            const turnaroundTime = endTime - process.arrivalTime;

            ganttChart.push({
                processId: process.id,
                startTime,
                endTime
            });

            currentTime = endTime;

            return {
                id: process.id,
                waitingTime,
                turnaroundTime
            };
        });

        return {
            algorithm: 'FCFS',
            results,
            ganttChart
        };
    }

    // SJF Algorithm (Non-preemptive)
    sjf(processes) {
        const processesCopy = [...processes];
        const ganttChart = [];
        const results = [];
        let currentTime = 0;
        let completed = 0;

        while (completed < processesCopy.length) {
            // Find processes that have arrived by current time
            const arrivedProcesses = processesCopy.filter(p => 
                p.arrivalTime <= currentTime && !p.completed
            );

            if (arrivedProcesses.length === 0) {
                // No process has arrived, move to next arrival time
                const nextArrival = Math.min(...processesCopy
                    .filter(p => !p.completed)
                    .map(p => p.arrivalTime));
                currentTime = nextArrival;
                continue;
            }

            // Find process with shortest burst time
            const shortestProcess = arrivedProcesses.reduce((min, p) => 
                p.burstTime < min.burstTime ? p : min
            );

            const startTime = currentTime;
            const endTime = startTime + shortestProcess.burstTime;
            const waitingTime = startTime - shortestProcess.arrivalTime;
            const turnaroundTime = endTime - shortestProcess.arrivalTime;

            ganttChart.push({
                processId: shortestProcess.id,
                startTime,
                endTime
            });

            results.push({
                id: shortestProcess.id,
                waitingTime,
                turnaroundTime
            });

            shortestProcess.completed = true;
            currentTime = endTime;
            completed++;
        }

        return {
            algorithm: 'SJF',
            results,
            ganttChart
        };
    }

    // SRTF Algorithm (Preemptive)
    srtf(processes) {
        const processesCopy = processes.map(p => ({
            ...p,
            remainingTime: p.burstTime,
            completed: false
        }));

        const ganttChart = [];
        const results = [];
        let currentTime = 0;
        let completed = 0;
        let lastProcess = null;

        while (completed < processesCopy.length) {
            // Find processes that have arrived by current time
            const arrivedProcesses = processesCopy.filter(p => 
                p.arrivalTime <= currentTime && !p.completed && p.remainingTime > 0
            );

            if (arrivedProcesses.length === 0) {
                // No process has arrived, move to next arrival time
                const nextArrival = Math.min(...processesCopy
                    .filter(p => !p.completed)
                    .map(p => p.arrivalTime));
                currentTime = nextArrival;
                continue;
            }

            // Find process with shortest remaining time
            const shortestProcess = arrivedProcesses.reduce((min, p) => 
                p.remainingTime < min.remainingTime ? p : min
            );

            // Add to Gantt chart if process changed
            if (lastProcess !== shortestProcess.id) {
                if (ganttChart.length > 0) {
                    ganttChart[ganttChart.length - 1].endTime = currentTime;
                }
                ganttChart.push({
                    processId: shortestProcess.id,
                    startTime: currentTime,
                    endTime: currentTime + 1
                });
                lastProcess = shortestProcess.id;
            } else {
                ganttChart[ganttChart.length - 1].endTime = currentTime + 1;
            }

            // Execute process for 1 time unit
            shortestProcess.remainingTime--;
            currentTime++;

            // Check if process completed
            if (shortestProcess.remainingTime === 0) {
                shortestProcess.completed = true;
                completed++;
                
                const turnaroundTime = currentTime - shortestProcess.arrivalTime;
                const waitingTime = turnaroundTime - shortestProcess.burstTime;

                results.push({
                    id: shortestProcess.id,
                    waitingTime,
                    turnaroundTime
                });
            }
        }

        return {
            algorithm: 'SRTF',
            results,
            ganttChart
        };
    }

    // Priority Scheduling (Non-preemptive)
    priorityNonPreemptive(processes) {
        const processesCopy = [...processes];
        const ganttChart = [];
        const results = [];
        let currentTime = 0;
        let completed = 0;

        while (completed < processesCopy.length) {
            // Find processes that have arrived by current time
            const arrivedProcesses = processesCopy.filter(p => 
                p.arrivalTime <= currentTime && !p.completed
            );

            if (arrivedProcesses.length === 0) {
                // No process has arrived, move to next arrival time
                const nextArrival = Math.min(...processesCopy
                    .filter(p => !p.completed)
                    .map(p => p.arrivalTime));
                currentTime = nextArrival;
                continue;
            }

            // Find process with highest priority (lowest priority number)
            const highestPriorityProcess = arrivedProcesses.reduce((min, p) => {
                const priority1 = p.priority || Infinity;
                const priority2 = min.priority || Infinity;
                return priority1 < priority2 ? p : min;
            });

            const startTime = currentTime;
            const endTime = startTime + highestPriorityProcess.burstTime;
            const waitingTime = startTime - highestPriorityProcess.arrivalTime;
            const turnaroundTime = endTime - highestPriorityProcess.arrivalTime;

            ganttChart.push({
                processId: highestPriorityProcess.id,
                startTime,
                endTime
            });

            results.push({
                id: highestPriorityProcess.id,
                waitingTime,
                turnaroundTime
            });

            highestPriorityProcess.completed = true;
            currentTime = endTime;
            completed++;
        }

        return {
            algorithm: 'Priority (Non-preemptive)',
            results,
            ganttChart
        };
    }

    // Priority Scheduling (Preemptive)
    priorityPreemptive(processes) {
        const processesCopy = processes.map(p => ({
            ...p,
            remainingTime: p.burstTime,
            completed: false
        }));

        const ganttChart = [];
        const results = [];
        let currentTime = 0;
        let completed = 0;
        let lastProcess = null;

        while (completed < processesCopy.length) {
            // Find processes that have arrived by current time
            const arrivedProcesses = processesCopy.filter(p => 
                p.arrivalTime <= currentTime && !p.completed && p.remainingTime > 0
            );

            if (arrivedProcesses.length === 0) {
                // No process has arrived, move to next arrival time
                const nextArrival = Math.min(...processesCopy
                    .filter(p => !p.completed)
                    .map(p => p.arrivalTime));
                currentTime = nextArrival;
                continue;
            }

            // Find process with highest priority (lowest priority number)
            const highestPriorityProcess = arrivedProcesses.reduce((min, p) => {
                const priority1 = p.priority || Infinity;
                const priority2 = min.priority || Infinity;
                return priority1 < priority2 ? p : min;
            });

            // Add to Gantt chart if process changed
            if (lastProcess !== highestPriorityProcess.id) {
                if (ganttChart.length > 0) {
                    ganttChart[ganttChart.length - 1].endTime = currentTime;
                }
                ganttChart.push({
                    processId: highestPriorityProcess.id,
                    startTime: currentTime,
                    endTime: currentTime + 1
                });
                lastProcess = highestPriorityProcess.id;
            } else {
                ganttChart[ganttChart.length - 1].endTime = currentTime + 1;
            }

            // Execute process for 1 time unit
            highestPriorityProcess.remainingTime--;
            currentTime++;

            // Check if process completed
            if (highestPriorityProcess.remainingTime === 0) {
                highestPriorityProcess.completed = true;
                completed++;
                
                const turnaroundTime = currentTime - highestPriorityProcess.arrivalTime;
                const waitingTime = turnaroundTime - highestPriorityProcess.burstTime;

                results.push({
                    id: highestPriorityProcess.id,
                    waitingTime,
                    turnaroundTime
                });
            }
        }

        return {
            algorithm: 'Priority (Preemptive)',
            results,
            ganttChart
        };
    }

    // Round Robin Algorithm
    roundRobin(processes, timeQuantum) {
        const processesCopy = processes.map(p => ({
            ...p,
            remainingTime: p.burstTime,
            completed: false
        }));

        const ganttChart = [];
        const results = [];
        let currentTime = 0;
        let completed = 0;
        const queue = [];

        // Add initial processes to queue
        const sortedProcesses = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
        let processIndex = 0;

        while (completed < processesCopy.length) {
            // Add newly arrived processes to queue
            while (processIndex < sortedProcesses.length && 
                   sortedProcesses[processIndex].arrivalTime <= currentTime) {
                const process = processesCopy.find(p => p.id === sortedProcesses[processIndex].id);
                if (process && !process.inQueue && !process.completed) {
                    queue.push(process);
                    process.inQueue = true;
                }
                processIndex++;
            }

            if (queue.length === 0) {
                // No process in queue, move to next arrival time
                if (processIndex < sortedProcesses.length) {
                    currentTime = sortedProcesses[processIndex].arrivalTime;
                    continue;
                }
            }

            // Get process from front of queue
            const currentProcess = queue.shift();
            currentProcess.inQueue = false;

            const executeTime = Math.min(timeQuantum, currentProcess.remainingTime);
            const startTime = currentTime;
            const endTime = currentTime + executeTime;

            ganttChart.push({
                processId: currentProcess.id,
                startTime,
                endTime
            });

            currentProcess.remainingTime -= executeTime;
            currentTime = endTime;

            // Add newly arrived processes during execution
            while (processIndex < sortedProcesses.length && 
                   sortedProcesses[processIndex].arrivalTime <= currentTime) {
                const process = processesCopy.find(p => p.id === sortedProcesses[processIndex].id);
                if (process && !process.inQueue && !process.completed) {
                    queue.push(process);
                    process.inQueue = true;
                }
                processIndex++;
            }

            // Check if process completed
            if (currentProcess.remainingTime === 0) {
                currentProcess.completed = true;
                completed++;
                
                const turnaroundTime = currentTime - currentProcess.arrivalTime;
                const waitingTime = turnaroundTime - currentProcess.burstTime;

                results.push({
                    id: currentProcess.id,
                    waitingTime,
                    turnaroundTime
                });
            } else {
                // Add process back to queue
                queue.push(currentProcess);
                currentProcess.inQueue = true;
            }
        }

        return {
            algorithm: 'Round Robin',
            results,
            ganttChart
        };
    }

    // Display Functions
    displayResults() {
        if (!this.results) return;

        // Show results section
        document.getElementById('resultsSection').style.display = 'block';
        document.getElementById('resultsSection').classList.add('fade-in');

        // Display Gantt Chart
        this.displayGanttChart();

        // Display Results Table
        this.displayResultsTable();

        // Display Averages
        this.displayAverages();
    }

    displayGanttChart() {
        const ganttChart = document.getElementById('ganttChart');
        ganttChart.innerHTML = '';

        const maxTime = Math.max(...this.results.ganttChart.map(item => item.endTime));
        const scale = Math.max(60, 800 / maxTime); // Minimum 60px per unit

        this.results.ganttChart.forEach((item, index) => {
            const block = document.createElement('div');
            block.className = 'gantt-block';
            block.style.width = `${(item.endTime - item.startTime) * scale}px`;
            block.style.backgroundColor = this.processColors[index % this.processColors.length];
            block.textContent = item.processId;

            // Add time label
            const timeLabel = document.createElement('div');
            timeLabel.className = 'gantt-time';
            timeLabel.textContent = item.startTime;
            block.appendChild(timeLabel);

            // Add tooltip
            block.title = `${item.processId}: ${item.startTime} - ${item.endTime}`;

            ganttChart.appendChild(block);
        });

        // Add final time label
        if (this.results.ganttChart.length > 0) {
            const finalTime = document.createElement('div');
            finalTime.className = 'gantt-time';
            finalTime.textContent = maxTime;
            finalTime.style.position = 'absolute';
            finalTime.style.right = '0';
            finalTime.style.bottom = '25px';
            ganttChart.appendChild(finalTime);
        }
    }

    displayResultsTable() {
        const tbody = document.getElementById('resultsTableBody');
        tbody.innerHTML = '';

        this.results.results.forEach(result => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${result.id}</td>
                <td>${result.waitingTime}</td>
                <td>${result.turnaroundTime}</td>
            `;
        });
    }

    displayAverages() {
        const avgWaitingTime = this.results.results.reduce((sum, r) => sum + r.waitingTime, 0) / this.results.results.length;
        const avgTurnaroundTime = this.results.results.reduce((sum, r) => sum + r.turnaroundTime, 0) / this.results.results.length;

        document.getElementById('avgWaitingTime').textContent = avgWaitingTime.toFixed(2);
        document.getElementById('avgTurnaroundTime').textContent = avgTurnaroundTime.toFixed(2);
    }

    // Utility Functions
    clearAll() {
        if (this.processes.length === 0) {
            this.showToast('No processes to clear', 'info');
            return;
        }

        if (confirm('Are you sure you want to clear all processes?')) {
            this.processes = [];
            this.results = null;
            this.editingIndex = null;
            this.resetForm();
            this.updateProcessTable();
            document.getElementById('resultsSection').style.display = 'none';
            this.showToast('All processes cleared', 'success');
        }
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');

        toastMessage.textContent = message;
        toast.className = `toast ${type}`;
        
        // Show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        // Hide toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Dark Mode Functions
    toggleDarkMode() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        this.showToast(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode enabled`, 'info');
    }

    loadDarkMode() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
}

// Initialize the simulator when DOM is loaded
let simulator;
document.addEventListener('DOMContentLoaded', () => {
    simulator = new CPUSchedulingSimulator();
});

// Export for global access
window.simulator = simulator;