const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const pool = require('./database');

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: '1811',
    resave: false,
    saveUninitialized: true
}));

// Middleware to check if user is logged in
function checkAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login');
}

// Middleware to check if user is admin
function checkAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.redirect('/login');
}

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            const validPassword = await bcrypt.compare(password, user.password);
            if (validPassword) {
                req.session.user = {
                    id: user.id,
                    username: user.username,
                    role: user.role
                };

                if (user.role === 'admin') {
                    res.redirect('/admin-dashboard');
                } else {
                    res.redirect('/player-dashboard');
                }
                return;
            }
        }
        res.render('login', { error: 'Invalid username or password' });
    } catch (err) {
        console.error(err);
        res.render('login', { error: 'An error occurred. Please try again.' });
    }
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    const { username, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        await pool.query('INSERT INTO users (username, password, role) VALUES ($1, $2, $3)', [username, hashedPassword, role]);
        res.redirect('/login');
    } catch (err) {
        console.error(err);
        res.render('register', { error: 'User already exists or invalid data' });
    }
});

app.get('/admin-dashboard', checkAuthenticated, checkAdmin, async (req, res) => {
    try {
        const eventsResult = await pool.query('SELECT * FROM events');
        res.render('admin-dashboard', { events: eventsResult.rows });
    } catch (err) {
        console.error(err);
        res.render('admin-dashboard', { error: 'An error occurred. Please try again.' });
    }
});

app.post('/admin-dashboard', checkAuthenticated, checkAdmin, async (req, res) => {
    const { name, date, time, venue, team_limit, description } = req.body;
    try {
        await pool.query(
            'INSERT INTO events (name, date, time, venue, team_limit, description, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7)', 
            [name, date, time, venue, team_limit, description, req.session.user.id]
        );
        res.redirect('/admin-dashboard');
    } catch (err) {
        console.error(err);
        res.render('admin-dashboard', { error: 'An error occurred. Please try again.' });
    }
});

app.get('/player-dashboard', checkAuthenticated, async (req, res) => {
    try {
        const eventsResult = await pool.query('SELECT * FROM events');
        const joinedEventsResult = await pool.query('SELECT event_id FROM event_participants WHERE user_id = $1', [req.session.user.id]);
        const joinedEventIds = joinedEventsResult.rows.map(row => row.event_id);
        res.render('player-dashboard', { events: eventsResult.rows, joinedEventIds });
    } catch (err) {
        console.error(err);
        res.render('player-dashboard', { error: 'An error occurred. Please try again.' });
    }
});

app.post('/join-event', checkAuthenticated, async (req, res) => {
    const { eventId } = req.body;
    try {
        await pool.query('INSERT INTO event_participants (event_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [eventId, req.session.user.id]);
        res.redirect('/player-dashboard');
    } catch (err) {
        console.error(err);
        res.render('player-dashboard', { error: 'An error occurred. Please try again.' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/');
        }
        res.clearCookie('sid');
        res.redirect('/login');
    });
});

// Delete Event
app.post('/delete-event', checkAuthenticated, checkAdmin, async (req, res) => {
    const eventId = req.body.eventId;
    try {
        await pool.query('DELETE FROM events WHERE id = $1', [eventId]);
        res.redirect('/admin-dashboard');
    } catch (err) {
        console.error(err);
        res.redirect('/admin-dashboard', { error: 'An error occurred. Please try again.' });
    }
});

// Edit Event (Render Edit Form)
app.get('/edit-event/:id', checkAuthenticated, checkAdmin, async (req, res) => {
    const eventId = req.params.id;
    try {
        const event = await pool.query('SELECT * FROM events WHERE id = $1', [eventId]);
        res.render('edit-event', { event: event.rows[0] });
    } catch (err) {
        console.error(err);
        res.redirect('/admin-dashboard', { error: 'An error occurred. Please try again.' });
    }
});

// Edit Event (Handle Form Submission)
app.post('/edit-event/:id', checkAuthenticated, checkAdmin, async (req, res) => {
    const eventId = req.params.id;
    const { name, date, time, venue, team_limit, description } = req.body;
    try {
        await pool.query(
            'UPDATE events SET name = $1, date = $2, time = $3, venue = $4, team_limit = $5, description = $6 WHERE id = $7',
            [name, date, time, venue, team_limit, description, eventId]
        );
        res.redirect('/admin-dashboard');
    } catch (err) {
        console.error(err);
        res.redirect('/admin-dashboard', { error: 'An error occurred. Please try again.' });
    }
});

// Redirect to Add Event Page
app.get('/add-event', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('add-event');
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

module.exports = app; // Ensure app is exported
