import React, { useEffect, useState } from 'react';
import { Film, Tv, Download, CheckCircle } from 'lucide-react';
import api from '../utils/api';
import { Link } from 'react-router-dom';

const styles = `
  .dash-header { margin-bottom: 32px; }
  .dash-title { font-family: 'Space Mono', monospace; font-size: 26px; font-weight: 700; color: #e8e8f0; }
  .dash-sub { font-size: 14px; color: #6b7280; margin-top: 4px; }
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 36px; }
  .stat-card { background: #0f0f1a; border: 1px solid #1a1a2e; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 8px; transition: border-color 0.15s; }
  .stat-card:hover { border-color: #2a2a4e; }
  .stat-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
  .stat-value { font-family: 'Space Mono', monospace; font-size: 28px; font-weight: 700; color: #e8e8f0; }
  .stat-label { font-size: 13px; color: #6b7280; }
  .section-title { font-size: 16px; font-weight: 600; color: #e8e8f0; margin-bottom: 16px; }
  .recent-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 14px; }
  .media-card { background: #0f0f1a; border: 1px solid #1a1a2e; border-radius: 10px; overflow: hidden; text-decoration: none; display: block; transition: transform 0.15s, border-color 0.15s; }
  .media-card:hover { transform: translateY(-2px); border-color: #6366f1; }
  .media-poster { width: 100%; aspect-ratio: 2/3; object-fit: cover; background: #1a1a2e; display: block; }
  .media-poster-placeholder { width: 100%; aspect-ratio: 2/3; background: #1a1a2e; display: flex; align-items: center; justify-content: center; }
  .media-info { padding: 10px; }
  .media-title { font-size: 12px; font-weight: 500; color: #e8e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .media-meta { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
  .badge-wanted { background: rgba(234, 179, 8, 0.15); color: #ca8a04; }
  .badge-downloaded { background: rgba(34, 197, 94, 0.15); color: #16a34a; }
  .badge-downloading { background: rgba(99, 102, 241, 0.15); color: #6366f1; }
  .badge-missing { background: rgba(239, 68, 68, 0.15); color: #dc2626; }
  .empty-state { text-align: center; padding: 40px; color: #4b5563; font-size: 14px; }
`;

function StatCard({ icon: Icon, value, label, color }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: color + '22' }}><Icon size={18} color={color} /></div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

const STATUS_BADGE = { wanted: 'badge-wanted', downloaded: 'badge-downloaded', downloading: 'badge-downloading', missing: 'badge-missing' };

export default function DashboardPage() {
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/media?limit=20').then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const movies = data.items.filter(i => i.type === 'movie');
  const series = data.items.filter(i => i.type === 'series');
  const downloading = data.items.filter(i => i.status === 'downloading');
  const downloaded = data.items.filter(i => i.status === 'downloaded');

  return (
    <>
      <style>{styles}</style>
      <div className="dash-header">
        <div className="dash-title">Dashboard</div>
        <div className="dash-sub">Overview of your media library</div>
      </div>
      <div className="stats-grid">
        <StatCard icon={Film} value={movies.length} label="Movies" color="#6366f1" />
        <StatCard icon={Tv} value={series.length} label="TV Shows" color="#8b5cf6" />
        <StatCard icon={Download} value={downloading.length} label="Downloading" color="#f59e0b" />
        <StatCard icon={CheckCircle} value={downloaded.length} label="Completed" color="#10b981" />
      </div>
      <div className="section-title">Recently Added</div>
      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : data.items.length === 0 ? (
        <div className="empty-state">No media yet. <Link to="/search" style={{ color: '#6366f1' }}>Search now →</Link></div>
      ) : (
        <div className="recent-grid">
          {data.items.slice(0, 16).map(item => (
            <Link key={item.id} to={`/library/${item.id}`} className="media-card">
              {item.poster_url
                ? <img src={item.poster_url} alt={item.title} className="media-poster" loading="lazy" />
                : <div className="media-poster-placeholder"><Film size={32} color="#2a2a4e" /></div>}
              <div className="media-info">
                <div className="media-title" title={item.title}>{item.title}</div>
                <div className="media-meta">{item.year} · {item.type === 'movie' ? 'Movie' : 'TV Show'}</div>
                <span className={`badge ${STATUS_BADGE[item.status] || ''}`}>{item.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
