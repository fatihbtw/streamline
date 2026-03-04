import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Calendar, Film, Tv, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import NzbSearchModal from '../components/NzbSearchModal';

const styles = `
  .back-btn { display: flex; align-items: center; gap: 6px; color: #6b7280; font-size: 14px; cursor: pointer; background: none; border: none; padding: 0; margin-bottom: 24px; font-family: 'DM Sans', sans-serif; }
  .back-btn:hover { color: #e8e8f0; }
  .detail-hero { display: flex; gap: 28px; margin-bottom: 32px; flex-wrap: wrap; }
  .detail-poster { width: 180px; flex-shrink: 0; border-radius: 12px; overflow: hidden; }
  .detail-poster img { width: 100%; display: block; }
  .detail-poster-ph { width: 180px; height: 270px; background: #1a1a2e; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
  .detail-info { flex: 1; min-width: 240px; }
  .detail-title { font-family: 'Space Mono', monospace; font-size: 28px; font-weight: 700; color: #e8e8f0; line-height: 1.2; margin-bottom: 10px; }
  .detail-meta { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 14px; }
  .meta-item { display: flex; align-items: center; gap: 5px; font-size: 14px; color: #9ca3af; }
  .detail-overview { font-size: 14px; color: #9ca3af; line-height: 1.6; margin-bottom: 20px; max-width: 680px; }
  .detail-actions { display: flex; gap: 10px; flex-wrap: wrap; }
  .action-primary { padding: 10px 20px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; border-radius: 8px; color: white; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; display: flex; align-items: center; gap: 6px; font-size: 14px; }
  .action-danger { padding: 10px 20px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 8px; color: #dc2626; font-weight: 500; cursor: pointer; font-family: 'DM Sans', sans-serif; display: flex; align-items: center; gap: 6px; font-size: 14px; }
  .status-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 500; }
  .status-wanted { background: rgba(234,179,8,0.15); color: #ca8a04; }
  .status-downloaded { background: rgba(34,197,94,0.15); color: #16a34a; }
  .status-downloading { background: rgba(99,102,241,0.15); color: #6366f1; }
  .status-missing { background: rgba(239,68,68,0.15); color: #dc2626; }
  .seasons-section { margin-top: 28px; }
  .season-title { font-size: 16px; font-weight: 600; color: #e8e8f0; margin-bottom: 12px; }
  .episodes-table { width: 100%; border-collapse: collapse; }
  .episodes-table th { text-align: left; padding: 8px 12px; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #1a1a2e; }
  .episodes-table td { padding: 10px 12px; font-size: 13px; color: #d1d5db; border-bottom: 1px solid #0f0f1a; }
  .ep-badge { font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: 500; }
  .ep-wanted { background: rgba(234,179,8,0.15); color: #ca8a04; }
  .ep-downloaded { background: rgba(34,197,94,0.15); color: #16a34a; }
  .ep-unaired { background: rgba(107,114,128,0.15); color: #6b7280; }
`;

export default function MediaDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNzb, setShowNzb] = useState(false);

  useEffect(() => {
    api.get(`/media/${id}`).then(r => setItem(r.data)).catch(() => navigate('/library')).finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm(`Remove "${item.title}" from library?`)) return;
    try {
      await api.delete(`/media/${id}`);
      toast.success('Removed from library');
      navigate('/library');
    } catch { toast.error('Failed to remove'); }
  };

  if (loading) return <div style={{ color: '#4b5563', padding: '40px', textAlign: 'center' }}>Loading...</div>;
  if (!item) return null;

  const statusClass = { wanted: 'status-wanted', downloaded: 'status-downloaded', downloading: 'status-downloading', missing: 'status-missing' };
  const epClass = { wanted: 'ep-wanted', downloaded: 'ep-downloaded', unaired: 'ep-unaired' };
  const seasons = {};
  if (item.episodes) {
    for (const ep of item.episodes) {
      if (!seasons[ep.season_number]) seasons[ep.season_number] = [];
      seasons[ep.season_number].push(ep);
    }
  }

  return (
    <>
      <style>{styles}</style>
      <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Back</button>
      <div className="detail-hero">
        <div className="detail-poster">
          {item.poster_url
            ? <img src={item.poster_url} alt={item.title} />
            : <div className="detail-poster-ph">{item.type === 'movie' ? <Film size={48} color="#2a2a4e" /> : <Tv size={48} color="#2a2a4e" />}</div>}
        </div>
        <div className="detail-info">
          <div className="detail-title">{item.title}</div>
          <div className="detail-meta">
            {item.year && <span className="meta-item"><Calendar size={14} />{item.year}</span>}
            {item.rating && <span className="meta-item"><Star size={14} color="#f59e0b" fill="#f59e0b" />{item.rating.toFixed(1)}</span>}
            <span className="meta-item">{item.type === 'movie' ? <Film size={14} /> : <Tv size={14} />}{item.type === 'movie' ? 'Movie' : 'TV Show'}</span>
            <span className={`status-badge ${statusClass[item.status] || ''}`}>{item.status}</span>
          </div>
          {item.overview && <div className="detail-overview">{item.overview}</div>}
          <div className="detail-actions">
            <button className="action-primary" onClick={() => setShowNzb(true)}><Search size={14} /> Search NZB</button>
            <button className="action-danger" onClick={handleDelete}><Trash2 size={14} /> Remove</button>
          </div>
        </div>
      </div>
      {Object.keys(seasons).length > 0 && (
        <div className="seasons-section">
          {Object.entries(seasons).map(([season, eps]) => (
            <div key={season} style={{ marginBottom: '24px' }}>
              <div className="season-title">Season {season}</div>
              <table className="episodes-table">
                <thead><tr><th>#</th><th>Title</th><th>Air Date</th><th>Status</th></tr></thead>
                <tbody>
                  {eps.map(ep => (
                    <tr key={ep.id}>
                      <td style={{ color: '#6b7280' }}>E{String(ep.episode_number).padStart(2, '0')}</td>
                      <td>{ep.title || '–'}</td>
                      <td>{ep.air_date || '–'}</td>
                      <td><span className={`ep-badge ${epClass[ep.status] || 'ep-wanted'}`}>{ep.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
      {showNzb && <NzbSearchModal title={item?.title} onClose={() => setShowNzb(false)} />}
    </>
  );
}
