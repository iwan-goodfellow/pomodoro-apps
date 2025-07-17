import sqlite3
import datetime
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)
DB_NAME = 'pomodoro.db'

def init_db():
    """Fungsi untuk inisialisasi database dan tabel."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    # Buat tabel jika belum ada
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS pomodoro_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            completion_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

@app.route('/')
def index():
    """Menampilkan halaman utama dari templates/index.html."""
    return render_template('index.html')

@app.route('/save-session', methods=['POST'])
def save_session():
    """Endpoint untuk menyimpan sesi pomodoro yang selesai."""
    try:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO pomodoro_sessions (completion_time) VALUES (?)", (datetime.datetime.now(),))
        conn.commit()
        conn.close()
        return jsonify({'status': 'success', 'message': 'Sesi berhasil disimpan!'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/get-stats')
def get_stats():
    """Endpoint untuk mengambil data statistik dengan filter waktu."""
    period = request.args.get('period', 'weekly')
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    today = datetime.date.today()
    labels, data = [], []
    chart_type = 'bar'

    if period == 'weekly':
        query = """
            SELECT DATE(completion_time), COUNT(*) 
            FROM pomodoro_sessions
            WHERE completion_time >= DATE('now', '-6 days')
            GROUP BY DATE(completion_time) ORDER BY DATE(completion_time) ASC;
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        
        stats = { (today - datetime.timedelta(days=i)).strftime('%Y-%m-%d'): 0 for i in range(7) }
        for row in rows:
            stats[row[0]] = row[1]
        
        sorted_stats = dict(sorted(stats.items()))
        labels = [datetime.datetime.strptime(d, '%Y-%m-%d').strftime('%a, %d') for d in sorted_stats.keys()]
        data = list(sorted_stats.values())

    elif period == 'monthly':
        first_day_of_month = today.replace(day=1)
        next_month = first_day_of_month.replace(day=28) + datetime.timedelta(days=4)
        last_day_of_month = next_month - datetime.timedelta(days=next_month.day)
        
        query = """
            SELECT DATE(completion_time), COUNT(*) 
            FROM pomodoro_sessions
            WHERE STRFTIME('%Y-%m', completion_time) = ?
            GROUP BY DATE(completion_time) ORDER BY DATE(completion_time) ASC;
        """
        cursor.execute(query, (today.strftime('%Y-%m'),))
        rows = cursor.fetchall()
        
        stats = { (first_day_of_month + datetime.timedelta(days=i)).strftime('%Y-%m-%d'): 0 for i in range(last_day_of_month.day) }
        for row in rows:
            stats[row[0]] = row[1]

        labels = [d.split('-')[2] for d in stats.keys()]
        data = list(stats.values())

    elif period == 'yearly':
        chart_type = 'line'
        query = """
            SELECT STRFTIME('%W', completion_time) as week_number, COUNT(*)
            FROM pomodoro_sessions
            WHERE STRFTIME('%Y', completion_time) = ?
            GROUP BY week_number ORDER BY week_number ASC;
        """
        cursor.execute(query, (today.strftime('%Y'),))
        rows = cursor.fetchall()
        
        stats = { str(i).zfill(2): 0 for i in range(53) }
        for row in rows:
            stats[row[0]] = row[1]
            
        labels = [f"W{int(w)+1}" for w in stats.keys()]
        data = list(stats.values())

    conn.close()
    return jsonify({'labels': labels, 'data': data, 'chart_type': chart_type})

if __name__ == '__main__':
    init_db()
    app.run(debug=True)