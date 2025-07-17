document.addEventListener('DOMContentLoaded', () => {
    const durationSelect = document.getElementById('duration-select');

    let focusTime = parseInt(durationSelect.value) * 60;
    let timeLeft = focusTime;
    let timerInterval = null;
    let isPaused = true;
    let chartInstance = null;

    // BARU: Variabel untuk menyimpan waktu selesai
    let endTime = 0;

    const timerDisplay = document.getElementById('timer-display');
    const startPauseBtn = document.getElementById('start-pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const statusText = document.getElementById('status-text');
    const notificationSound = document.getElementById('notification-sound');
    const btnWeekly = document.getElementById('btn-weekly');
    const btnMonthly = document.getElementById('btn-monthly');
    const btnYearly = document.getElementById('btn-yearly');
    const chartControlButtons = document.querySelectorAll('.chart-controls button');

    function requestNotificationPermission() { if (Notification.permission === 'default') { Notification.requestPermission(); } }
    requestNotificationPermission();

    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    function showNotification() { if (Notification.permission === 'granted') { new Notification('Waktunya Istirahat!', { body: 'Kerja bagus! Ayo break dulu ☕️✨', icon: 'https://img.icons8.com/emoji/48/tomato-emoji.png' }); notificationSound.play(); } }

    async function saveSession() {
        try {
            await fetch('/save-session', { method: 'POST' });
            console.log('Sesi berhasil disimpan.');
            const activePeriod = document.querySelector('.chart-controls button.active').id.split('-')[1];
            updateChart(activePeriod);
        } catch (error) {
            console.error('Gagal menyimpan sesi:', error);
        }
    }
    
    function toggleTimer() {
        durationSelect.disabled = true;

        if (isPaused) {
            isPaused = false;
            // UPDATE: Catat waktu selesai berdasarkan sisa waktu yang ada
            endTime = Date.now() + timeLeft * 1000;
            
            startPauseBtn.textContent = 'Jeda';
            statusText.textContent = 'Lagi fokus... jangan ganggu!';
            
            timerInterval = setInterval(() => {
                // UPDATE: Hitung sisa waktu berdasarkan selisih waktu, bukan dikurangi 1
                const newTimeLeft = Math.round((endTime - Date.now()) / 1000);
                timeLeft = newTimeLeft > 0 ? newTimeLeft : 0;
                
                updateTimerDisplay();

                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    showNotification();
                    saveSession();
                    resetTimer();
                }
            }, 1000);
        } else {
            isPaused = true;
            startPauseBtn.textContent = 'Lanjut';
            statusText.textContent = 'Lagi dijeda nih.';
            clearInterval(timerInterval);
            durationSelect.disabled = false;
        }
    }

    function resetTimer() {
        clearInterval(timerInterval);
        isPaused = true;
        focusTime = parseInt(durationSelect.value) * 60;
        timeLeft = focusTime;
        endTime = 0; // Reset waktu selesai
        updateTimerDisplay();
        startPauseBtn.textContent = 'Mulai';
        statusText.textContent = 'Waktunya untuk fokus!';
        durationSelect.disabled = false;
    }

    durationSelect.addEventListener('change', () => {
        resetTimer();
    });
    
    async function updateChart(period = 'weekly') {
        try {
            const response = await fetch(`/get-stats?period=${period}`);
            const stats = await response.json();
            
            const ctx = document.getElementById('stats-chart').getContext('2d');
            if (chartInstance) {
                chartInstance.destroy();
            }

            chartInstance = new Chart(ctx, {
                type: stats.chart_type,
                data: {
                    labels: stats.labels,
                    datasets: [{
                        label: 'Sesi Fokus Selesai',
                        data: stats.data,
                        backgroundColor: stats.chart_type === 'line' ? 'rgba(255, 99, 71, 0.2)' : 'rgba(255, 99, 71, 0.7)',
                        borderColor: 'rgba(255, 99, 71, 1)',
                        borderWidth: stats.chart_type === 'line' ? 2 : 1,
                        borderRadius: stats.chart_type === 'bar' ? 5 : 0,
                        fill: stats.chart_type === 'line' ? true : false,
                        tension: 0.1
                    }]
                },
                options: {
                    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                    plugins: { legend: { display: false } }
                }
            });
        } catch (error) {
            console.error('Gagal memuat statistik:', error);
        }
    }

    function handleActiveButton(button) {
        chartControlButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    }

    startPauseBtn.addEventListener('click', toggleTimer);
    resetBtn.addEventListener('click', resetTimer);
    
    btnWeekly.addEventListener('click', () => { handleActiveButton(btnWeekly); updateChart('weekly'); });
    btnMonthly.addEventListener('click', () => { handleActiveButton(btnMonthly); updateChart('monthly'); });
    btnYearly.addEventListener('click', () => { handleActiveButton(btnYearly); updateChart('yearly'); });

    updateTimerDisplay();
    updateChart('weekly');
});