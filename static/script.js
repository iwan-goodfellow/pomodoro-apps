document.addEventListener('DOMContentLoaded', () => {
    // Ambil elemen dropdown baru
    const durationSelect = document.getElementById('duration-select');

    // Waktu fokus tidak lagi konstan, tapi diambil dari dropdown
    let focusTime = parseInt(durationSelect.value) * 60;
    let timeLeft = focusTime;
    let timerInterval = null;
    let isPaused = true;
    let chartInstance = null;

    // Ambil elemen lain dari HTML
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
    
    function showNotification() { if (Notification.permission === 'granted') { new Notification('Waktunya Istirahat!', { body: 'Kerja bagus! Ayo break dulu ☕️✨', icon: 'https://icons8.com/icon/woMC0BA8mqBt/alarm-clock' }); notificationSound.play(); } }

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
        // Saat timer jalan, nonaktifkan dropdown
        durationSelect.disabled = true;

        if (isPaused) {
            isPaused = false;
            startPauseBtn.textContent = 'Jeda';
            statusText.textContent = 'Lagi fokus... jangan ganggu!';
            timerInterval = setInterval(() => {
                timeLeft--;
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
            // Saat di-pause, aktifkan lagi dropdown
            durationSelect.disabled = false;
        }
    }

    function resetTimer() {
        clearInterval(timerInterval);
        isPaused = true;
        // Ambil waktu dari dropdown saat reset
        focusTime = parseInt(durationSelect.value) * 60;
        timeLeft = focusTime;
        updateTimerDisplay();
        startPauseBtn.textContent = 'Mulai';
        statusText.textContent = 'Waktunya untuk fokus!';
        // Aktifkan lagi dropdown saat di-reset
        durationSelect.disabled = false;
    }

    // BARU: Event listener saat pilihan dropdown berubah
    durationSelect.addEventListener('change', () => {
        // Langsung reset timer dengan durasi baru
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

    // Inisialisasi tampilan awal
    updateTimerDisplay();
    updateChart('weekly');
});