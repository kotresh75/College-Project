import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import axios from 'axios';

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
    // Lock state is now ephemeral (clears on refresh/restart)
    const [isLocked, setIsLocked] = useState(false);
    const [autoLockMinutes, setAutoLockMinutes] = useState(0); // 0 = Never
    const [lastActivity, setLastActivity] = useState(Date.now());

    // Timer Ref to clear/reset timeouts
    const lockTimerRef = useRef(null);

    // If auth_token is removed (logout / cleared), auto-unlock
    useEffect(() => {
        const checkAuth = () => {
            if (!localStorage.getItem('auth_token')) {
                setIsLocked(false);
            }
        };
        // Listen for storage changes (e.g. logout in another context)
        window.addEventListener('storage', checkAuth);
        // Also check periodically in case logout happens in the same tab
        const interval = setInterval(checkAuth, 2000);
        return () => {
            window.removeEventListener('storage', checkAuth);
            clearInterval(interval);
        };
    }, []);

    // Fetch settings on mount
    const refreshSessionSettings = useCallback(async () => {
        try {
            const res = await axios.get('http://localhost:17221/api/settings/app');
            if (res.data?.app_security?.autoLockMinutes) {
                setAutoLockMinutes(parseInt(res.data.app_security.autoLockMinutes));
            } else {
                setAutoLockMinutes(0);
            }
        } catch (err) {
            console.error("Failed to fetch session settings", err);
        }
    }, []);

    useEffect(() => {
        refreshSessionSettings();
    }, [refreshSessionSettings]);

    // Activity Tracker
    const updateActivity = useCallback(() => {
        if (!isLocked) {
            setLastActivity(Date.now());
        }
    }, [isLocked]);

    useEffect(() => {
        // Events to track
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

        // Throttled handler
        let throttleTimer;
        const handleActivity = () => {
            if (!throttleTimer) {
                throttleTimer = setTimeout(() => {
                    updateActivity();
                    throttleTimer = null;
                }, 1000); // Only update once per second max
            }
        };

        events.forEach(event => window.addEventListener(event, handleActivity));

        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
            if (throttleTimer) clearTimeout(throttleTimer);
        };
    }, [updateActivity]);

    // Lock Checker
    useEffect(() => {
        // If disabled or already locked, do nothing
        if (autoLockMinutes <= 0 || isLocked) {
            if (lockTimerRef.current) clearInterval(lockTimerRef.current);
            return;
        }

        const checkLock = () => {
            const now = Date.now();
            const timeSinceActivity = now - lastActivity;
            const lockTimeMs = autoLockMinutes * 60 * 1000;

            if (timeSinceActivity >= lockTimeMs) {
                lock();
            }
        };

        // Check every second
        lockTimerRef.current = setInterval(checkLock, 1000);

        return () => {
            if (lockTimerRef.current) clearInterval(lockTimerRef.current);
        };
    }, [autoLockMinutes, lastActivity, isLocked]);

    const lock = () => {
        // Only lock if user is actually logged in
        if (!localStorage.getItem('auth_token')) return;
        setIsLocked(true);
    };

    const unlock = async (password) => {
        try {
            // Get current user email from local storage
            const userInfoStr = localStorage.getItem('user_info');
            if (!userInfoStr) throw new Error("No active session found");

            const userInfo = JSON.parse(userInfoStr);

            // Verify password via login endpoint (or a specific verify endpoint if available)
            // Using login endpoint is safe as it verifies credentials
            await axios.post('http://localhost:17221/api/auth/login', {
                email: userInfo.email,
                password: password
            });

            // If success
            setIsLocked(false);
            setLastActivity(Date.now());
            return true;
        } catch (err) {
            console.error("Unlock failed", err);
            throw new Error(err.response?.data?.message || "Invalid password");
        }
    };

    return (
        <SessionContext.Provider value={{ isLocked, lock, unlock, refreshSessionSettings }}>
            {children}
        </SessionContext.Provider>
    );
};

export const useSession = () => useContext(SessionContext);
