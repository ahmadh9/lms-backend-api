// config/passport.js
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import pool from './db.js';

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      // لاحقًا: نحفظ المستخدم في قاعدة البيانات إذا ما كان موجود
      const userData = {
        name: profile.displayName,
        email: profile.emails[0].value,
        oauth_provider: 'google',
        oauth_id: profile.id,
    
      };
     // return done(null, userData);
      const email = profile.emails[0].value;
  const oauth_id = profile.id;
  
  try {
    // هل المستخدم موجود بالفعل؟
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    let user;
    if (existing.rows.length > 0) {
      user = existing.rows[0]; // موجود
    } else {
      // أضفه لقاعدة البيانات
      const insert = await pool.query(
        `INSERT INTO users (name, email, role, oauth_provider, oauth_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [profile.displayName, email, 'student', 'google', oauth_id]
      );
      user = insert.rows[0];
    }

    // نرجع المستخدم لـ passport
    return done(null, user);
  } catch (err) {
    console.error('❌ Error saving user:', err);
    return done(err, null);
  }

    }
  )
);

// حفظ واستعادة المستخدم في session
passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});
