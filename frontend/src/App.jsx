import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line } from 'recharts';
import { Crown, Users, TrendingUp, Activity, RefreshCw, ArrowLeft, BarChart2, LayoutDashboard, Search, Home, ClipboardList, Settings as SettingsIcon, Banknote, Plus, Save, X, Upload } from 'lucide-react';

function App() {
    const [teams, setTeams] = useState([]);
    const [freeAgents, setFreeAgents] = useState([]);
    const [scoringRules, setScoringRules] = useState({});
    const [history, setHistory] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [teamHistory, setTeamHistory] = useState([]);
    const [selectedStat, setSelectedStat] = useState('total_points');
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [playerHistory, setPlayerHistory] = useState([]);
    const [selectedHistoryDay, setSelectedHistoryDay] = useState('');
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [showDailyStats, setShowDailyStats] = useState(false);
    const [settings, setSettings] = useState({ score_sync_interval: 5, salary_sync_frequency: 'weekly', salary_cap: 72.0 });
    const [sortConfig, setSortConfig] = useState({ key: 'total_points', direction: 'desc' });

    // Salary Feature State
    const [salaries, setSalaries] = useState([]);
    const [salarySearch, setSalarySearch] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [currentEditPlayer, setCurrentEditPlayer] = useState(null);
    const [newPlayer, setNewPlayer] = useState({ fullName: '', team: '', position: 'F', salary: '', contract_years: '0' });
    const [uploadFile, setUploadFile] = useState(null);
    const [comparePlayer, setComparePlayer] = useState(null);
    const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

    const getSlotAbbrev = (slot) => {
        const map = { 'Forward': 'F', 'Defense': 'D', 'Goalie': 'G', 'Bench': 'BN', 'BE': 'BN' };
        return map[slot] || slot || 'BN';
    };

    const isBench = (slot) => slot === 'BE' || slot === 'Bench' || slot === 'BN';

    const fetchData = async () => {
        try {
            setLoading(true);
            const teamsRes = await axios.get('/api/teams');
            const faRes = await axios.get('/api/players/free_agents');
            const scoringRes = await axios.get('/api/settings/scoring');
            const historyRes = await axios.get('/api/teams/history');
            const settingsRes = await axios.get('/api/settings');
            const salariesRes = await axios.get('/api/players/salaries');
            setTeams(teamsRes.data);
            setFreeAgents(faRes.data);
            setScoringRules(scoringRes.data);
            setHistory(historyRes.data);
            setSettings(settingsRes.data);
            setSalaries(salariesRes.data);
        } catch (error) {
            console.error("Error fetching data", error);
            if (teams.length === 0) {
                setTeams([
                    { id: 1, name: 'Team A', points: 1200 },
                    { id: 2, name: 'Team B', points: 1150 },
                    { id: 3, name: 'Team C', points: 1000 },
                ])
            }
        } finally {
            setLoading(false);
        }
    };

    const triggerSync = async () => {
        try {
            setSyncing(true);
            // Run both syncs concurrently
            await Promise.all([
                axios.post('/api/sync'),
                axios.post('/api/sync/salaries')
            ]);
            await fetchData();
        } catch (error) {
            console.error("Error syncing", error);
        } finally {
            setSyncing(false);
        }
    };

    const fetchTeamHistory = async (teamId, stat = selectedStat) => {
        try {
            const res = await axios.get(`/api/teams/${teamId}/players/history?stat=${stat}`);
            setTeamHistory(res.data);
        } catch (error) {
            console.error("Error fetching team history", error);
        }
    };

    const handleStatChange = (stat) => {
        setSelectedStat(stat);
        if (selectedTeam) {
            fetchTeamHistory(selectedTeam.id, stat);
        }
    };

    const handleTeamClick = (team) => {
        setSelectedTeam(team);
        setSelectedPlayer(null);
        fetchTeamHistory(team.id);
        pushState({ selectedTeamId: team.id, selectedPlayerId: null });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePlayerClick = async (player) => {
        setSelectedPlayer(player);
        pushState({ selectedPlayerId: player.id });
        try {
            const res = await axios.get(`/api/players/${player.id}/history`);
            setPlayerHistory(res.data);
        } catch (error) {
            console.error("Error fetching player history", error);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const requestSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const sortedFreeAgents = React.useMemo(() => {
        let sortableItems = [...freeAgents];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key] ?? 0;
                const bValue = b[sortConfig.key] ?? 0;

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [freeAgents, sortConfig]);

    useEffect(() => {
        fetchData();

        // Baseline state
        if (!window.history.state) {
            window.history.replaceState({ activeTab: 'dashboard', selectedTeamId: null, selectedPlayerId: null }, '');
        }

        const handlePopState = (event) => {
            if (event.state) {
                const { activeTab, selectedTeamId, selectedPlayerId } = event.state;
                setActiveTab(activeTab || 'dashboard');

                // Restore Team
                if (selectedTeamId) {
                    const team = teams.find(t => t.id === selectedTeamId);
                    if (team) {
                        setSelectedTeam(team);
                        fetchTeamHistory(team.id);
                    }
                } else {
                    setSelectedTeam(null);
                }

                // Restore Player
                if (selectedPlayerId) {
                    const player = teams.flatMap(t => t.players || []).find(p => p.id === selectedPlayerId) ||
                        freeAgents.find(p => p.id === selectedPlayerId);
                    if (player) {
                        setSelectedPlayer(player);
                        axios.get(`/api/players/${player.id}/history`).then(res => setPlayerHistory(res.data));
                    }
                } else {
                    setSelectedPlayer(null);
                }
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [teams, freeAgents]);

    const pushState = (updates) => {
        const newState = {
            activeTab,
            selectedTeamId: selectedTeam?.id,
            selectedPlayerId: selectedPlayer?.id,
            ...updates
        };
        window.history.pushState(newState, '');
    };

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        setSelectedTeam(null);
        setSelectedPlayer(null);
        pushState({ activeTab: tabId, selectedTeamId: null, selectedPlayerId: null });
    };

    useEffect(() => {
        if (history.length > 0 && !selectedHistoryDay) {
            setSelectedHistoryDay(history[history.length - 1].day);
        }
    }, [history]);

    const toDailyData = (data, keysToProcess) => {
        if (!data || data.length < 2) return [];
        const dailyData = [];
        for (let i = 1; i < data.length; i++) {
            const current = data[i];
            const prev = data[i - 1];
            const newItem = { ...current };

            // If keysToProcess is provided, only process those keys
            // Otherwise try to process all numeric keys
            const keys = keysToProcess || Object.keys(current).filter(k => typeof current[k] === 'number');

            keys.forEach(key => {
                const currVal = current[key] || 0;
                const prevVal = prev[key] || 0;
                newItem[key] = currVal - prevVal;
            });
            dailyData.push(newItem);
        }
        return dailyData;
    };

    const SortIndicator = ({ columnKey }) => {
        const isActive = sortConfig.key === columnKey;
        return (
            <span style={{
                marginLeft: '8px',
                fontSize: '0.7rem',
                color: isActive ? 'var(--accent-primary)' : 'rgba(255,255,255,0.2)',
                display: 'inline-block',
                transition: 'all 0.2s'
            }}>
                {isActive ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕'}
            </span>
        );
    };

    const CustomDot = (props) => {
        const { cx, cy, payload, stroke } = props;
        const benchStatus = isBench(payload.lineup_slot);

        if (benchStatus) {
            return (
                <circle cx={cx} cy={cy} r={4} stroke={stroke} strokeWidth={2} fill="var(--bg-card)" fillOpacity={1} />
            );
        }
        return (
            <circle cx={cx} cy={cy} r={4} stroke={stroke} strokeWidth={0} fill={stroke} />
        );
    };

    const handleUploadSalaries = async () => {
        if (!uploadFile) return alert("Please select a file first");
        const formData = new FormData();
        formData.append("file", uploadFile);

        try {
            setSyncing(true);
            const res = await axios.post('/api/settings/upload_salaries', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert(res.data.message);
            fetchData();
        } catch (error) {
            console.error(error);
            alert("Upload failed");
        } finally {
            setSyncing(false);
            setUploadFile(null);
        }
    };

    const handleUpdateSalary = async () => {
        if (!currentEditPlayer) return;
        try {
            await axios.put(`/api/players/${currentEditPlayer.id}/salary`, {
                salary: currentEditPlayer.salary,
                contract_years: currentEditPlayer.contract_years
            });
            setIsEditModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            alert("Update failed");
        }
    };

    const handleCreatePlayer = async () => {
        try {
            await axios.post('/api/players', newPlayer);
            setIsAddModalOpen(false);
            setNewPlayer({ fullName: '', team: '', position: 'F', salary: '', contract_years: '0' });
            fetchData();
        } catch (error) {
            console.error(error);
            alert("Create failed: " + (error.response?.data?.detail || error.message));
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {/* Top Navigation */}
            <header style={{
                height: '64px',
                background: 'rgba(15, 23, 42, 0.95)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                padding: '0 2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 1000
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <h1 style={{
                        fontSize: '1.1rem',
                        fontWeight: '800',
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        margin: 0,
                        whiteSpace: 'nowrap'
                    }}>
                        PUCKINTEL
                    </h1>

                    <nav style={{ display: 'flex', gap: '0.5rem', background: 'none', backdropFilter: 'none', border: 'none', position: 'static', padding: 0 }}>
                        {[
                            { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
                            { id: 'standings', label: 'Teams & Standings', icon: Crown },
                            { id: 'free-agents', label: 'Players', icon: Search },
                            { id: 'salaries', label: 'Salaries', icon: Banknote },
                            { id: 'settings', label: 'Settings', icon: SettingsIcon }
                        ].map(item => (
                            <button
                                key={item.id}
                                onClick={() => handleTabChange(item.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '0.4rem',
                                    border: 'none',
                                    background: activeTab === item.id ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                                    color: activeTab === item.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    fontWeight: activeTab === item.id ? '600' : '500',
                                    fontSize: '0.85rem',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <item.icon size={16} />
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <button
                    className="btn"
                    onClick={triggerSync}
                    disabled={syncing}
                    style={{
                        display: 'flex',
                        gap: '0.4rem',
                        alignItems: 'center',
                        fontSize: '0.8rem',
                        padding: '0.5rem 1rem',
                        borderRadius: '0.4rem'
                    }}
                >
                    <RefreshCw size={14} className={syncing ? 'spin' : ''} />
                    {syncing ? 'Syncing...' : 'Sync Data'}
                </button>
            </header>

            {/* Main Content */}
            <main style={{ flexGrow: 1, padding: '2rem 3rem' }}>
                {loading && teams.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem' }}>Loading...</div>
                ) : selectedPlayer ? (
                    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <button
                                className="btn"
                                onClick={() => window.history.back()}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)' }}
                            >
                                <ArrowLeft size={18} /> Back
                            </button>
                        </div>

                        <div className="card" style={{ marginBottom: '2rem', padding: '2.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                    borderRadius: '1.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '2rem',
                                    fontWeight: 'bold',
                                    color: 'white'
                                }}>
                                    {selectedPlayer.fullName[0]}
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '2.5rem', margin: 0, fontWeight: '800' }}>{selectedPlayer.fullName}</h2>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                                        <span style={{ background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.8rem', borderRadius: '1rem' }}>{selectedPlayer.position}</span>
                                        <span style={{ background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.8rem', borderRadius: '1rem' }}>{selectedPlayer.proTeam}</span>
                                        {selectedPlayer.salary && (
                                            <span style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-primary)', padding: '0.2rem 0.8rem', borderRadius: '1rem', fontWeight: 'bold' }}>
                                                {selectedPlayer.salary}/yr
                                            </span>
                                        )}
                                        {selectedPlayer.contract_years && (
                                            <span style={{ background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.8rem', borderRadius: '1rem' }}>
                                                Expires: {selectedPlayer.contract_years}
                                            </span>
                                        )}
                                        {selectedPlayer.status !== 'HEALTHY' && (
                                            <span style={{ color: '#ef4444', fontWeight: 'bold' }}>● {selectedPlayer.status}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card" style={{ marginBottom: '2rem', minHeight: '400px' }}>
                            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                    <h3 style={{ margin: 0 }}>Stat Progression</h3>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={showDailyStats}
                                            onChange={(e) => setShowDailyStats(e.target.checked)}
                                            style={{ accentColor: 'var(--accent-primary)' }}
                                        />
                                        Show Daily Stats
                                    </label>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {['total_points', 'goals', 'assists', 'sog', 'hits', 'blocks'].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setSelectedStat(s)}
                                            style={{
                                                padding: '0.4rem 0.8rem',
                                                borderRadius: '0.4rem',
                                                border: 'none',
                                                fontSize: '0.8rem',
                                                cursor: 'pointer',
                                                background: selectedStat === s ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                                                color: selectedStat === s ? 'white' : 'var(--text-secondary)',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {s.replace('_', ' ').toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ height: '350px', padding: '1.5rem' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={showDailyStats ? toDailyData(playerHistory, [selectedStat]) : playerHistory}>
                                        <defs>
                                            <linearGradient id="colorStat" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis
                                            dataKey="day"
                                            stroke="var(--text-secondary)"
                                            fontSize={12}
                                            tickFormatter={(val) => val.split('-').slice(1).join('/')}
                                        />
                                        <YAxis stroke="var(--text-secondary)" fontSize={12} />
                                        <Tooltip
                                            contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey={selectedStat}
                                            stroke="var(--accent-primary)"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorStat)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                ) : selectedTeam ? (
                    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <button
                                className="btn"
                                onClick={() => setSelectedTeam(null)}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)' }}
                            >
                                <ArrowLeft size={18} /> Back
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Switch Team:</span>
                                <select
                                    value={selectedTeam.id}
                                    onChange={(e) => {
                                        const team = teams.find(t => t.id === parseInt(e.target.value));
                                        if (team) handleTeamClick(team);
                                    }}
                                    style={{
                                        background: '#1e293b',
                                        color: '#f8fafc',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '0.5rem',
                                        padding: '0.5rem 1rem',
                                        fontSize: '0.875rem',
                                        outline: 'none',
                                        cursor: 'pointer',
                                        appearance: 'none',
                                        paddingRight: '2rem',
                                        backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 0.7rem top 50%',
                                        backgroundSize: '0.65rem auto'
                                    }}
                                >
                                    {teams.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <header style={{ marginBottom: '3rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                                <h1 style={{ fontSize: '2.5rem', margin: 0 }}>{selectedTeam.name}</h1>
                                <div style={{
                                    padding: '0.25rem 0.75rem',
                                    background: 'var(--accent-primary)',
                                    borderRadius: '1rem',
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold'
                                }}>
                                    Rank #{selectedTeam.rank}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '2rem', color: 'var(--text-secondary)' }}>
                                <p>Total Fantasy Points: {selectedTeam.points?.toFixed(1)}</p>
                                {(() => {
                                    const totalSalary = (selectedTeam.players || []).reduce((sum, p) => sum + (p.salary_value || 0), 0);
                                    const totalSalaryMillions = totalSalary / 1000000;
                                    const capSpace = settings.salary_cap - totalSalaryMillions;
                                    const isOverCap = capSpace < 0;
                                    return (
                                        <>
                                            <p>Total Salary: <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>${totalSalaryMillions.toFixed(2)}M</span></p>
                                            <p>Cap Space: <span style={{ color: isOverCap ? '#ef4444' : 'var(--success)', fontWeight: 'bold' }}>${capSpace.toFixed(2)}M</span></p>
                                        </>
                                    );
                                })()}
                            </div>
                        </header>

                        <div className="card" style={{ height: '550px', marginBottom: '3rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <TrendingUp color="var(--accent-primary)" />
                                    <h3>Player Performance Analysis</h3>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', marginLeft: '1rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={showDailyStats}
                                            onChange={(e) => setShowDailyStats(e.target.checked)}
                                            style={{ accentColor: 'var(--accent-primary)' }}
                                        />
                                        Show Daily Stats
                                    </label>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '0.25rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    {[
                                        { id: 'total_points', label: 'Points' },
                                        { id: 'goals', label: 'Goals' },
                                        { id: 'assists', label: 'Assists' },
                                        { id: 'sog', label: 'Shots' },
                                        { id: 'hits', label: 'Hits' }
                                    ].map(stat => (
                                        <button
                                            key={stat.id}
                                            onClick={() => handleStatChange(stat.id)}
                                            style={{
                                                padding: '0.4rem 0.8rem',
                                                borderRadius: '0.4rem',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                border: 'none',
                                                background: selectedStat === stat.id ? 'var(--accent-primary)' : 'transparent',
                                                color: selectedStat === stat.id ? '#fff' : 'var(--text-secondary)',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {stat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                Currently viewing: <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold', textTransform: 'uppercase' }}>{selectedStat.replace('_', ' ')}</span>
                            </div>
                            <ResponsiveContainer width="100%" height="80%">
                                <LineChart data={showDailyStats ? toDailyData(teamHistory) : teamHistory}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                                    <YAxis stroke="#94a3b8" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem' }}
                                        itemStyle={{ fontSize: '0.875rem' }}
                                    />
                                    <Legend />
                                    {(selectedTeam.players || []).slice().sort((a, b) => (b.total_points || 0) - (a.total_points || 0)).slice(0, 10).map((player, index) => {
                                        const colors = ['#38bdf8', '#818cf8', '#c084fc', '#fb7185', '#fbbf24', '#34d399', '#f472b6', '#a78bfa', '#2dd4bf'];
                                        return (
                                            <Line
                                                key={player.id}
                                                type="monotone"
                                                dataKey={player.fullName}
                                                stroke={colors[index % colors.length]}
                                                strokeWidth={2}
                                                dot={{ r: 3 }}
                                            />
                                        );
                                    })}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div style={{ marginTop: '3rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <Users color="var(--accent-secondary)" />
                                <h3>Live Roster Statistics</h3>
                            </div>
                            <div className="card" style={{ overflowX: 'auto', padding: '0.5rem' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <th style={{ padding: '1rem' }}>Player</th>
                                            <th style={{ padding: '1rem' }}>Slot</th>
                                            <th style={{ padding: '1rem' }}>Pos</th>
                                            <th style={{ padding: '1rem', textAlign: 'center' }}>Salary</th>
                                            <th style={{ padding: '1rem', textAlign: 'center' }}>G</th>
                                            <th style={{ padding: '1rem', textAlign: 'center' }}>A</th>
                                            <th style={{ padding: '1rem', textAlign: 'center' }}>+/-</th>
                                            <th style={{ padding: '1rem', textAlign: 'center' }}>SOG</th>
                                            <th style={{ padding: '1rem', textAlign: 'center' }}>BLK</th>
                                            <th style={{ padding: '1rem', textAlign: 'right' }}>Total FPts</th>
                                            <th style={{ padding: '1rem', textAlign: 'center' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(selectedTeam.players || []).slice().sort((a, b) => {
                                            const isBenchA = isBench(a.lineup_slot);
                                            const isBenchB = isBench(b.lineup_slot);
                                            if (isBenchA && !isBenchB) return 1;
                                            if (!isBenchA && isBenchB) return -1;
                                            return (b.total_points || 0) - (a.total_points || 0);
                                        }).map(player => {
                                            const benchStatus = isBench(player.lineup_slot);
                                            return (
                                                <tr key={player.id} style={{
                                                    borderBottom: '1px solid rgba(255,255,255,0.02)',
                                                    opacity: benchStatus ? 0.6 : 1,
                                                    background: benchStatus ? 'rgba(0,0,0,0.1)' : 'transparent'
                                                }}>
                                                    <td style={{ padding: '1rem' }}>
                                                        <div
                                                            onClick={() => handlePlayerClick(player)}
                                                            style={{ fontWeight: '600', cursor: 'pointer' }}
                                                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
                                                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                                                        >
                                                            {player.fullName}
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{player.proTeam}</div>
                                                    </td>
                                                    <td style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 'bold' }}>{getSlotAbbrev(player.lineup_slot)}</td>
                                                    <td style={{ padding: '1rem' }}>{player.position}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--accent-primary)' }}>{player.salary || 'N/A'}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'center' }}>{player.goals}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'center' }}>{player.assists}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'center' }}>{player.plus_minus}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'center' }}>{player.sog}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'center' }}>{player.blocks}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                                                        {(player.total_points || 0).toFixed(1)}
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                        <button
                                                            onClick={() => {
                                                                setComparePlayer(player);
                                                                setIsCompareModalOpen(true);
                                                            }}
                                                            style={{
                                                                background: 'transparent',
                                                                border: '1px solid rgba(56, 189, 248, 0.3)',
                                                                color: 'var(--accent-primary)',
                                                                padding: '0.3rem 0.6rem',
                                                                borderRadius: '0.3rem',
                                                                cursor: 'pointer',
                                                                fontSize: '0.75rem',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.4rem',
                                                                margin: '0 auto'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.background = 'transparent';
                                                            }}
                                                        >
                                                            <BarChart2 size={14} /> Compare FA
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                        {activeTab === 'dashboard' && (
                            <>
                                <header style={{ marginBottom: '3rem' }}>
                                    <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>League Overview</h2>
                                    <p style={{ color: 'var(--text-secondary)' }}>Live Analytics & Progression</p>
                                </header>

                                <div className="stats-grid">
                                    <div className="card">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                            <Crown color="var(--accent-primary)" />
                                            <h3>League Leader</h3>
                                        </div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{teams[0]?.name || 'N/A'}</div>
                                        <div style={{ color: 'var(--success)', fontSize: '0.875rem' }}>{teams[0]?.points?.toFixed(1)} Fantasy Points</div>
                                    </div>

                                    <div className="card">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                            <TrendingUp color="var(--accent-secondary)" />
                                            <h3>Top Free Agent</h3>
                                        </div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{freeAgents[0]?.fullName || 'N/A'}</div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{freeAgents[0]?.total_points?.toFixed(1) || 0} FPts</div>
                                    </div>
                                </div>

                                <div className="card" style={{ marginTop: '2.5rem', height: '450px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                        <TrendingUp color="var(--accent-primary)" />
                                        <h3>Team Points Progression</h3>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', marginLeft: '1rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={showDailyStats}
                                                onChange={(e) => setShowDailyStats(e.target.checked)}
                                                style={{ accentColor: 'var(--accent-primary)' }}
                                            />
                                            Show Daily Stats
                                        </label>
                                    </div>
                                    <ResponsiveContainer width="100%" height="90%">
                                        <LineChart data={showDailyStats ? toDailyData(history) : history}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                                            <YAxis stroke="#94a3b8" fontSize={12} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem' }}
                                                itemStyle={{ fontSize: '0.875rem' }}
                                            />
                                            <Legend />
                                            {teams.map((team, index) => {
                                                const colors = ['#38bdf8', '#818cf8', '#c084fc', '#fb7185', '#fbbf24', '#34d399', '#f472b6', '#a78bfa', '#2dd4bf'];
                                                return (
                                                    <Line
                                                        key={team.id}
                                                        type="monotone"
                                                        dataKey={team.name}
                                                        stroke={colors[index % colors.length]}
                                                        strokeWidth={3}
                                                        dot={{ r: 4 }}
                                                        activeDot={{ r: 6 }}
                                                    />
                                                );
                                            })}
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </>
                        )}

                        {activeTab === 'standings' && (
                            <>
                                <header style={{ marginBottom: '2rem' }}>
                                    <h2 style={{ fontSize: '2rem' }}>League Standings</h2>
                                </header>
                                <div className="card" style={{ padding: '0.5rem' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                                <th style={{ padding: '1rem' }}>Rank</th>
                                                <th style={{ padding: '1rem' }}>Team</th>
                                                <th style={{ padding: '1rem', textAlign: 'center' }}>Cap Space</th>
                                                <th style={{ padding: '1rem', textAlign: 'center' }}>G</th>
                                                <th style={{ padding: '1rem', textAlign: 'center' }}>A</th>
                                                <th style={{ padding: '1rem', textAlign: 'center' }}>PPP</th>
                                                <th style={{ padding: '1rem', textAlign: 'center' }}>SOG</th>
                                                <th style={{ padding: '1rem', textAlign: 'center' }}>HIT</th>
                                                <th style={{ padding: '1rem', textAlign: 'center' }}>BLK</th>
                                                <th style={{ padding: '1rem', textAlign: 'right' }}>Total Points</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {teams.map(team => {
                                                const totalSalary = (team.players || []).reduce((sum, p) => sum + (p.salary_value || 0), 0) / 1000000;
                                                const capSpace = settings.salary_cap - totalSalary;
                                                const isOverCap = capSpace < 0;
                                                return (
                                                    <tr key={team.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>#{team.rank}</td>
                                                        <td style={{ padding: '1rem' }}>{team.name}</td>
                                                        <td style={{ padding: '1rem', textAlign: 'center', color: isOverCap ? '#ef4444' : 'var(--success)', fontWeight: 'bold' }}>${capSpace.toFixed(2)}M</td>
                                                        <td style={{ padding: '1rem', textAlign: 'center' }}>{team.goals || 0}</td>
                                                        <td style={{ padding: '1rem', textAlign: 'center' }}>{team.assists || 0}</td>
                                                        <td style={{ padding: '1rem', textAlign: 'center' }}>{team.ppp || 0}</td>
                                                        <td style={{ padding: '1rem', textAlign: 'center' }}>{team.sog || 0}</td>
                                                        <td style={{ padding: '1rem', textAlign: 'center' }}>{team.hits || 0}</td>
                                                        <td style={{ padding: '1rem', textAlign: 'center' }}>{team.blocks || 0}</td>
                                                        <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--accent-primary)', fontWeight: 'bold' }}>{team.points?.toFixed(1)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                <div style={{ marginTop: '3rem' }}>
                                    <header style={{ marginBottom: '2rem' }}>
                                        <h2 style={{ fontSize: '2rem' }}>League Rosters</h2>
                                    </header>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                                        gap: '1.5rem'
                                    }}>
                                        {teams.map(team => (
                                            <div
                                                key={team.id}
                                                className="card team-card-clickable"
                                                style={{
                                                    padding: '0',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.3s',
                                                    border: '1px solid rgba(255,255,255,0.05)'
                                                }}
                                                onClick={() => handleTeamClick(team)}
                                            >
                                                <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                                                    <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{team.name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Rank #{team.rank} • {team.points?.toFixed(0)} FPts</div>
                                                </div>
                                                <div style={{ padding: '0.5rem', maxHeight: '350px', overflowY: 'auto' }}>
                                                    {team.players?.sort((a, b) => {
                                                        // Sort by Lineup Slot: Active first, Bench last
                                                        const isBenchA = isBench(a.lineup_slot);
                                                        const isBenchB = isBench(b.lineup_slot);
                                                        if (isBenchA && !isBenchB) return 1;
                                                        if (!isBenchA && isBenchB) return -1;
                                                        // Secondary sort by points
                                                        return b.total_points - a.total_points;
                                                    }).map(player => {
                                                        const benchStatus = isBench(player.lineup_slot);
                                                        return (
                                                            <div key={player.id} style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                padding: '0.5rem 0.75rem',
                                                                opacity: benchStatus ? 0.6 : 1,
                                                                background: benchStatus ? 'rgba(0,0,0,0.1)' : 'transparent'
                                                            }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                    <div style={{
                                                                        fontSize: '0.7rem',
                                                                        fontWeight: 'bold',
                                                                        color: benchStatus ? 'var(--text-secondary)' : 'var(--accent-secondary)',
                                                                        width: '28px',
                                                                        textAlign: 'center'
                                                                    }}>
                                                                        {getSlotAbbrev(player.lineup_slot)}
                                                                    </div>
                                                                    <div style={{ fontSize: '0.85rem' }}>{player.fullName}</div>
                                                                </div>
                                                                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{player.total_points?.toFixed(1)}</div>
                                                            </div>
                                                        );
                                                    })}
                                                    <div style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--accent-primary)', opacity: 0.7 }}>Click to view full roster</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ marginTop: '3rem', animation: 'fadeIn 0.5s ease-out' }}>
                                    <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <Activity size={20} color="var(--accent-primary)" />
                                            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Historical Point Snapshots</h3>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '0.4rem 1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '500' }}>Select Date:</span>
                                            <input
                                                type="date"
                                                value={selectedHistoryDay}
                                                onChange={(e) => setSelectedHistoryDay(e.target.value)}
                                                min={history.length > 0 ? history[0].day : undefined}
                                                max={history.length > 0 ? history[history.length - 1].day : undefined}
                                                style={{
                                                    background: 'transparent',
                                                    color: '#f8fafc',
                                                    border: 'none',
                                                    fontSize: '0.85rem',
                                                    outline: 'none',
                                                    cursor: 'pointer',
                                                    fontWeight: 'bold',
                                                    colorScheme: 'dark'
                                                }}
                                            />
                                        </div>
                                    </header>

                                    <div className="card" style={{ padding: '1.5rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                            {(selectedHistoryDay && history.length > 0) ? (() => {
                                                const currentDayIdx = history.findIndex(h => h.day === selectedHistoryDay);
                                                const currentDayData = history[currentDayIdx];
                                                const prevDayData = currentDayIdx > 0 ? history[currentDayIdx - 1] : null;

                                                return Object.entries(currentDayData)
                                                    .filter(([key]) => key !== 'day')
                                                    .sort((a, b) => b[1] - a[1])
                                                    .map(([teamName, pts], idx) => {
                                                        const prevPts = prevDayData ? (prevDayData[teamName] || 0) : 0;
                                                        const diff = prevDayData ? pts - prevPts : 0;

                                                        return (
                                                            <div key={teamName} style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                padding: '1rem',
                                                                background: 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                                                                borderRadius: '0.75rem',
                                                                border: '1px solid rgba(255,255,255,0.05)',
                                                                transition: 'transform 0.2s'
                                                            }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', width: '20px' }}>{idx + 1}.</span>
                                                                    <div>
                                                                        <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{teamName}</div>
                                                                        {prevDayData && (
                                                                            <div style={{
                                                                                fontSize: '0.7rem',
                                                                                color: diff >= 0 ? 'var(--success)' : '#ef4444',
                                                                                fontWeight: 'bold',
                                                                                marginTop: '0.1rem'
                                                                            }}>
                                                                                {diff >= 0 ? '+' : ''}{diff.toFixed(1)} gain
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div style={{
                                                                    background: idx === 0 ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                                                                    padding: '0.25rem 0.5rem',
                                                                    borderRadius: '0.4rem',
                                                                    color: idx === 0 ? 'var(--accent-primary)' : 'var(--text-primary)',
                                                                    fontWeight: '800',
                                                                    fontSize: '1rem'
                                                                }}>
                                                                    {pts.toFixed(1)}
                                                                </div>
                                                            </div>
                                                        );
                                                    });
                                            })() : (
                                                <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem' }}>
                                                    No historical snapshots recorded yet. Try clicking "Sync Data" to begin tracking.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'free-agents' && (
                            <>
                                <header style={{ marginBottom: '2rem' }}>
                                    <h2 style={{ fontSize: '2rem' }}>Available Talent</h2>
                                    <p style={{ color: 'var(--text-secondary)' }}>Top unowned players based on season performance</p>
                                </header>
                                <div className="card" style={{ overflowX: 'auto', padding: '0.5rem' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid #334155' }}>
                                                <th style={{ padding: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => requestSort('fullName')}>
                                                    <div style={{ display: 'flex', alignItems: 'center' }}>Player <SortIndicator columnKey="fullName" /></div>
                                                </th>
                                                <th style={{ padding: '1rem', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => requestSort('proTeam')}>
                                                    <div style={{ display: 'flex', alignItems: 'center' }}>Team <SortIndicator columnKey="proTeam" /></div>
                                                </th>
                                                <th style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => requestSort('ownership')}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Owned % <SortIndicator columnKey="ownership" /></div>
                                                </th>
                                                <th style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => requestSort('salary_value')}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Salary <SortIndicator columnKey="salary_value" /></div>
                                                </th>
                                                <th style={{ padding: '1rem', textAlign: 'center' }}>G</th>
                                                <th style={{ padding: '1rem', textAlign: 'center' }}>A</th>
                                                <th style={{ padding: '1rem', textAlign: 'center' }}>SOG</th>
                                                <th style={{ padding: '1rem', textAlign: 'right', cursor: 'pointer' }} onClick={() => requestSort('total_points')}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>FPts <SortIndicator columnKey="total_points" /></div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedFreeAgents.map(fa => (
                                                <tr key={fa.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <td style={{ padding: '1rem' }}>
                                                        <div
                                                            onClick={() => handlePlayerClick(fa)}
                                                            style={{ fontWeight: '600', cursor: 'pointer' }}
                                                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
                                                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                                                        >
                                                            {fa.fullName}
                                                        </div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{fa.position}</div>
                                                    </td>
                                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{fa.proTeam}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'center' }}>{fa.ownership?.toFixed(1)}%</td>
                                                    <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--accent-primary)' }}>
                                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(fa.salary_value || 0)}
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'center' }}>{fa.goals}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'center' }}>{fa.assists}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'center' }}>{fa.sog}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{fa.total_points?.toFixed(1)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}



                        {activeTab === 'salaries' && (
                            <>
                                <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h2 style={{ fontSize: '2rem', margin: 0 }}>Salary Management</h2>
                                        <p style={{ color: 'var(--text-secondary)' }}>Manage player contracts and salaries</p>
                                    </div>
                                    <button
                                        className="btn"
                                        onClick={() => setIsAddModalOpen(true)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                    >
                                        <Plus size={18} /> Add Player
                                    </button>
                                </header>

                                <div className="card" style={{ padding: '1rem', marginBottom: '2rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <Search size={20} color="var(--text-secondary)" />
                                        <input
                                            type="text"
                                            placeholder="Search players..."
                                            value={salarySearch}
                                            onChange={(e) => setSalarySearch(e.target.value)}
                                            style={{ background: 'transparent', border: 'none', color: 'white', flexGrow: 1, outline: 'none' }}
                                        />
                                    </div>
                                </div>

                                <div className="card" style={{ padding: '0.5rem', overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                                <th style={{ padding: '1rem' }}>Player</th>
                                                <th style={{ padding: '1rem' }}>Team</th>
                                                <th style={{ padding: '1rem' }}>Position</th>
                                                <th style={{ padding: '1rem', textAlign: 'right' }}>Salary</th>
                                                <th style={{ padding: '1rem', textAlign: 'center' }}>Years Left</th>
                                                <th style={{ padding: '1rem', textAlign: 'center' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {salaries.filter(p => p.fullName.toLowerCase().includes(salarySearch.toLowerCase())).map(p => (
                                                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                    <td style={{ padding: '1rem', fontWeight: '600' }}>{p.fullName}</td>
                                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{p.proTeam}</td>
                                                    <td style={{ padding: '1rem' }}>{p.position}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'monospace', color: 'var(--accent-primary)' }}>
                                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(p.salary_value || 0)}
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                        {p.contract_years || '0'}
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                        <button
                                                            onClick={() => {
                                                                setCurrentEditPlayer({ ...p });
                                                                setIsEditModalOpen(true);
                                                            }}
                                                            style={{
                                                                background: 'transparent',
                                                                border: '1px solid rgba(255,255,255,0.1)',
                                                                color: 'var(--text-secondary)',
                                                                padding: '0.3rem 0.6rem',
                                                                borderRadius: '0.3rem',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            Edit
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Edit Modal */}
                                {isEditModalOpen && currentEditPlayer && (
                                    <div style={{
                                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                                        background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
                                    }}>
                                        <div className="card" style={{ width: '400px', padding: '2rem' }}>
                                            <h3 style={{ marginTop: 0 }}>Edit Salary</h3>
                                            <div style={{ marginBottom: '1rem' }}>
                                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Player</div>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{currentEditPlayer.fullName}</div>
                                            </div>
                                            <div style={{ marginBottom: '1rem' }}>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Salary (e.g. $5,000,000)</label>
                                                <input
                                                    type="text"
                                                    value={currentEditPlayer.salary}
                                                    onChange={(e) => setCurrentEditPlayer({ ...currentEditPlayer, salary: e.target.value })}
                                                    style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', padding: '0.5rem', color: 'white', borderRadius: '0.4rem' }}
                                                />
                                            </div>
                                            <div style={{ marginBottom: '2rem' }}>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Years Left</label>
                                                <input
                                                    type="text"
                                                    value={currentEditPlayer.contract_years}
                                                    onChange={(e) => setCurrentEditPlayer({ ...currentEditPlayer, contract_years: e.target.value })}
                                                    style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', padding: '0.5rem', color: 'white', borderRadius: '0.4rem' }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                                <button className="btn" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }} onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                                                <button className="btn" onClick={handleUpdateSalary}>Save Changes</button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Add Player Modal */}
                                {isAddModalOpen && (
                                    <div style={{
                                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                                        background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
                                    }}>
                                        <div className="card" style={{ width: '400px', padding: '2rem' }}>
                                            <h3 style={{ marginTop: 0 }}>Add New Player</h3>
                                            <div style={{ display: 'grid', gap: '1rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem' }}>Full Name</label>
                                                    <input
                                                        type="text"
                                                        value={newPlayer.fullName}
                                                        onChange={(e) => setNewPlayer({ ...newPlayer, fullName: e.target.value })}
                                                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', padding: '0.5rem', color: 'white', borderRadius: '0.4rem' }}
                                                    />
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                    <div>
                                                        <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem' }}>Team</label>
                                                        <input
                                                            type="text"
                                                            value={newPlayer.team}
                                                            onChange={(e) => setNewPlayer({ ...newPlayer, team: e.target.value })}
                                                            style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', padding: '0.5rem', color: 'white', borderRadius: '0.4rem' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem' }}>Position</label>
                                                        <select
                                                            value={newPlayer.position}
                                                            onChange={(e) => setNewPlayer({ ...newPlayer, position: e.target.value })}
                                                            style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', padding: '0.5rem', color: 'white', borderRadius: '0.4rem' }}
                                                        >
                                                            <option value="F">Forward</option>
                                                            <option value="D">Defense</option>
                                                            <option value="G">Goalie</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem' }}>Salary</label>
                                                    <input
                                                        type="text"
                                                        value={newPlayer.salary}
                                                        onChange={(e) => setNewPlayer({ ...newPlayer, salary: e.target.value })}
                                                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', padding: '0.5rem', color: 'white', borderRadius: '0.4rem' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem' }}>Years Left</label>
                                                    <input
                                                        type="text"
                                                        value={newPlayer.contract_years}
                                                        onChange={(e) => setNewPlayer({ ...newPlayer, contract_years: e.target.value })}
                                                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', padding: '0.5rem', color: 'white', borderRadius: '0.4rem' }}
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                                                <button className="btn" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }} onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                                                <button className="btn" onClick={handleCreatePlayer}>Create Player</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {activeTab === 'settings' && (
                            <>
                                <header style={{ marginBottom: '2rem' }}>
                                    <h2 style={{ fontSize: '2rem' }}>League Settings</h2>
                                    <p style={{ color: 'var(--text-secondary)' }}>Manage application configuration and view rules</p>
                                </header>

                                <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                                    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <RefreshCw size={20} /> Sync Configuration
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Score Sync Interval (Minutes)</label>
                                            <input
                                                type="number"
                                                value={settings.score_sync_interval}
                                                onChange={(e) => setSettings({ ...settings, score_sync_interval: parseInt(e.target.value) })}
                                                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', padding: '0.5rem', color: 'white', borderRadius: '0.4rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>League Salary Cap ($ Million)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={settings.salary_cap}
                                                onChange={(e) => setSettings({ ...settings, salary_cap: parseFloat(e.target.value) })}
                                                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', padding: '0.5rem', color: 'white', borderRadius: '0.4rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Salary Sync Frequency</label>
                                            <select
                                                value={settings.salary_sync_frequency}
                                                onChange={(e) => setSettings({ ...settings, salary_sync_frequency: e.target.value })}
                                                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', padding: '0.5rem', color: 'white', borderRadius: '0.4rem' }}
                                            >
                                                <option value="daily">Daily</option>
                                                <option value="weekly">Weekly</option>
                                                <option value="manual">Manual Only</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                                        <button className="btn" onClick={async () => {
                                            try {
                                                await axios.post('/api/settings', settings);
                                                alert('Settings saved!');
                                            } catch (e) { alert('Error saving settings'); }
                                        }}>
                                            Save Configuration
                                        </button>
                                        <button className="btn" style={{ background: 'rgba(255,255,255,0.05)' }} onClick={async () => {
                                            try {
                                                await axios.post('/api/sync/salaries');
                                                alert('Salary sync triggered!');
                                            } catch (e) { alert('Error triggering sync'); }
                                        }}>
                                            Force Salary Sync
                                        </button>
                                    </div>

                                </div>

                                <h3 style={{ marginBottom: '1rem' }}>Scoring Rules</h3>
                                <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1.5rem' }}>
                                    {Object.entries(scoringRules).map(([stat, pts]) => (
                                        <div key={stat} style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '1rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{stat}</div>
                                            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{pts > 0 ? `+${pts}` : pts}</div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </main>

            {/* Compare Modal */}
            {isCompareModalOpen && comparePlayer && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000,
                    backdropFilter: 'blur(8px)'
                }}>
                    <div className="card" style={{ width: '900px', maxWidth: '95vw', maxHeight: '90vh', padding: '2.5rem', overflowY: 'auto', position: 'relative', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                        <button
                            onClick={() => setIsCompareModalOpen(false)}
                            style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        >
                            <X size={24} />
                        </button>

                        <header style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Player Comparison</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>Comparing <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{comparePlayer.fullName}</span> with top available {comparePlayer.position}s</p>
                        </header>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                            {/* Selected Player Card */}
                            <div className="card" style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', height: 'fit-content' }}>
                                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <h3 style={{ margin: 0, color: 'var(--accent-primary)' }}>{comparePlayer.fullName}</h3>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{comparePlayer.proTeam} • {comparePlayer.position}</div>
                                </div>
                                <div style={{ padding: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Total Points</span>
                                        <span style={{ fontWeight: 'bold' }}>{(comparePlayer.total_points || 0).toFixed(1)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Salary</span>
                                        <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>{comparePlayer.salary || 'N/A'}</span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '0.4rem' }}>
                                            <div style={{ color: 'var(--text-secondary)' }}>G / A</div>
                                            <div>{comparePlayer.goals} / {comparePlayer.assists}</div>
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '0.4rem' }}>
                                            <div style={{ color: 'var(--text-secondary)' }}>SOG / BLK</div>
                                            <div>{comparePlayer.sog} / {comparePlayer.blocks}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Comparison Table */}
                            <div>
                                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Users size={20} color="var(--accent-secondary)" /> Top Available Free Agents
                                </h3>
                                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <th style={{ padding: '1rem' }}>Free Agent</th>
                                                <th style={{ padding: '1rem', textAlign: 'center' }}>Salary</th>
                                                <th style={{ padding: '1rem', textAlign: 'center' }}>FPts</th>
                                                <th style={{ padding: '1rem', textAlign: 'right' }}>Diff</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(freeAgents || [])
                                                .filter(fa => fa.position === comparePlayer.position)
                                                .sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
                                                .slice(0, 8)
                                                .map(fa => {
                                                    const ptsDiff = (fa.total_points || 0) - (comparePlayer.total_points || 0);
                                                    const isPositive = ptsDiff > 0;
                                                    return (
                                                        <tr key={fa.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                            <td style={{ padding: '1rem' }}>
                                                                <div style={{ fontWeight: '600' }}>{fa.fullName}</div>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{fa.proTeam}</div>
                                                            </td>
                                                            <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--accent-secondary)' }}>
                                                                {fa.salary ? (
                                                                    fa.salary_value ? `$${(fa.salary_value / 1000000).toFixed(2)}M` : fa.salary
                                                                ) : 'N/A'}
                                                            </td>
                                                            <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>
                                                                {(fa.total_points || 0).toFixed(1)}
                                                            </td>
                                                            <td style={{ padding: '1rem', textAlign: 'right', color: isPositive ? 'var(--success)' : '#ef4444', fontWeight: 'bold' }}>
                                                                {isPositive ? '+' : ''}{ptsDiff.toFixed(1)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .team-card-clickable:hover {
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
                    border-color: var(--accent-primary) !important;
                }
                /* Hide sidebar on mobile or handle properly */
                @media (max-width: 768px) {
                    aside { display: none; }
                    main { margin-left: 0 !important; width: 100% !important; }
                }
            `}</style>
        </div >
    );
}

export default App;
