import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line } from 'recharts';
import { Crown, Users, TrendingUp, Activity, RefreshCw, ArrowLeft, BarChart2, LayoutDashboard, Search, Home, ClipboardList } from 'lucide-react';

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
    const [sortConfig, setSortConfig] = useState({ key: 'total_points', direction: 'desc' });

    const fetchData = async () => {
        try {
            setLoading(true);
            const teamsRes = await axios.get('/api/teams');
            const faRes = await axios.get('/api/players/free_agents');
            const scoringRes = await axios.get('/api/settings/scoring');
            const historyRes = await axios.get('/api/teams/history');
            setTeams(teamsRes.data);
            setFreeAgents(faRes.data);
            setScoringRules(scoringRes.data);
            setHistory(historyRes.data);
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
            await axios.post('/api/sync');
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePlayerClick = async (player) => {
        setSelectedPlayer(player);
        setSelectedTeam(null);
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
    }, []);

    useEffect(() => {
        if (history.length > 0 && !selectedHistoryDay) {
            setSelectedHistoryDay(history[history.length - 1].day);
        }
    }, [history]);

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
                            { id: 'standings', label: 'Standings', icon: Crown },
                            { id: 'rosters', label: 'Teams', icon: Users },
                            { id: 'free-agents', label: 'Players', icon: Search },
                            { id: 'scoring', label: 'Rules', icon: Activity }
                        ].map(item => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveTab(item.id);
                                    setSelectedTeam(null);
                                }}
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
                                onClick={() => setSelectedPlayer(null)}
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
                                <h3 style={{ margin: 0 }}>Stat Progression</h3>
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
                                    <AreaChart data={playerHistory}>
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
                            <p style={{ color: 'var(--text-secondary)' }}>Total Fantasy Points: {selectedTeam.points?.toFixed(1)}</p>
                        </header>

                        <div className="card" style={{ height: '550px', marginBottom: '3rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <TrendingUp color="var(--accent-primary)" />
                                    <h3>Player Performance Analysis</h3>
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
                                <LineChart data={teamHistory}>
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
                                            <th style={{ padding: '1rem' }}>Pos</th>
                                            <th style={{ padding: '1rem', textAlign: 'center' }}>Salary</th>
                                            <th style={{ padding: '1rem', textAlign: 'center' }}>G</th>
                                            <th style={{ padding: '1rem', textAlign: 'center' }}>A</th>
                                            <th style={{ padding: '1rem', textAlign: 'center' }}>+/-</th>
                                            <th style={{ padding: '1rem', textAlign: 'center' }}>SOG</th>
                                            <th style={{ padding: '1rem', textAlign: 'right' }}>Total FPts</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(selectedTeam.players || []).slice().sort((a, b) => (b.total_points || 0) - (a.total_points || 0)).map(player => (
                                            <tr key={player.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
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
                                                <td style={{ padding: '1rem' }}>{player.position}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--accent-primary)' }}>{player.salary || 'N/A'}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center' }}>{player.goals}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center' }}>{player.assists}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center' }}>{player.plus_minus}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center' }}>{player.sog}</td>
                                                <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                                                    {(player.total_points || 0).toFixed(1)}
                                                </td>
                                            </tr>
                                        ))}
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
                                    </div>
                                    <ResponsiveContainer width="100%" height="90%">
                                        <LineChart data={history}>
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
                                            {teams.map(team => (
                                                <tr key={team.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>#{team.rank}</td>
                                                    <td style={{ padding: '1rem' }}>{team.name}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'center' }}>{team.goals || 0}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'center' }}>{team.assists || 0}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'center' }}>{team.ppp || 0}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'center' }}>{team.sog || 0}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'center' }}>{team.hits || 0}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'center' }}>{team.blocks || 0}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--accent-primary)', fontWeight: 'bold' }}>{team.points?.toFixed(1)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
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
                                                    <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--accent-primary)' }}>{fa.salary || 'N/A'}</td>
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

                        {activeTab === 'rosters' && (
                            <>
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
                                                {team.players?.sort((a, b) => b.total_points - a.total_points).slice(0, 5).map(player => (
                                                    <div key={player.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem' }}>
                                                        <div style={{ fontSize: '0.85rem' }}>{player.fullName}</div>
                                                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{player.total_points?.toFixed(1)}</div>
                                                    </div>
                                                ))}
                                                <div style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--accent-primary)', opacity: 0.7 }}>Click to view full roster</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {activeTab === 'scoring' && (
                            <>
                                <header style={{ marginBottom: '2rem' }}>
                                    <h2 style={{ fontSize: '2rem' }}>Scoring Rules</h2>
                                    <p style={{ color: 'var(--text-secondary)' }}>How fantasy points are calculated for this league</p>
                                </header>
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
