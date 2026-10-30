
-- TASK 3: SHIPTIVITAS ANALYTICS
-- Kanban Board released on June 2, 2018

-- PART 1: Daily active users before and after release

SELECT
    date(login_timestamp, 'unixepoch') AS login_date,
    COUNT(DISTINCT user_id) AS daily_active_users,
    CASE
        WHEN date(login_timestamp, 'unixepoch') < '2018-06-02'
        THEN 'Before Release'
        ELSE 'After Release'
    END AS release_period
FROM login_history
GROUP BY date(login_timestamp, 'unixepoch')
ORDER BY login_date;


-- PART 2: Number of status changes by card per day

SELECT
    date(timestamp, 'unixepoch') AS change_date,
    cardID AS card_id,
    COUNT(*) AS status_changes
FROM card_change_history
WHERE oldStatus IS NOT newStatus
GROUP BY date(timestamp, 'unixepoch'), cardID
ORDER BY change_date, card_id;
