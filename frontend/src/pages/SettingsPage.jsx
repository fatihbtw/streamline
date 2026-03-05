import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, TestTube, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const styles = `
  .settings-title { font-family: 'Space Mono', monospace; font-size: 26px; font-weight: 700; color: #e8e8f0; margin-bottom: 32px; }
  .settings-sections { display: flex; flex-direction: column; gap: 28px; }
  .settings-card { background: #0f0f1a; border: 1px solid #1a1a2e; border-radius: 12px; padding: 24px; }
  .card-title { font-size: 15px; font-weight: 600; color: #e8e8f0; margin-bottom: 18px; display: flex; align-items: center; gap: 8px; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
  .form-label { font-size: 12px; font-weight: 500; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.04em; }
  .form-input { width: 100%; padding: 10px 14px; background: #1a1a2e; border: 1px solid #2a2a4e; border-radius: 8px; color: #e8e8f0; font-size: 14px; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.15s; box-sizing: border-box; }
  .form-input:focus { border-color: #6366f1; }
  .input-wrap { position: relative; }
  .pw-toggle { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #6b7280; cursor: pointer; }
  .btn-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  .btn-save { padding: 10px 20px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; border-radius: 8px; color: white; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; display: flex; align-items: center; gap: 6px; font-size: 14px; }
  .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-test { padding: 10px 20px; background: #1a1a2e; border: 1px solid #2a2a4e; border-radius: 8px; color: #6b7280; font-weight: 500; cursor: pointer; font-family: 'DM Sans', sans-serif; display: flex; align-items: center; gap: 6px; font-size: 14px; }
  .btn-test:hover { color: #e8e8f0; }
  .test-result { display: flex; align-items: center; gap: 6px; font-size: 13px; padding: 8px 12px; border-radius: 6px; margin-top: 10px; }
  .test-ok { background: rgba(34,197,94,0.1); color: #16a34a; }
  .test-fail { background: rgba(239,68,68,0.1); color: #dc2626; }
  .indexer-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
  .indexer-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: #1a1a2e; border-radius: 8px; }
  .indexer-name { flex: 1; font-size: 14px; color: #e8e8f0; }
  .indexer-type { font-size: 12px; color: #6b7280; padding: 2px 8px; background: #0f0f1a; border-radius: 4px; }
  .indexer-url { font-size: 12px; color: #4b5563; flex: 2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .del-btn { background: none; border: none; color: #6b7280; cursor: pointer; }
  .del-btn:hover { color: #ef4444; }
  .add-indexer-form { border: 1px dashed #2a2a4e; border-radius: 8px; padding: 16px; margin-top: 8px; }
  .provider-toggle { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
  .provider-card { padding: 14px 16px; background: #1a1a2e; border: 1px solid #2a2a4e; border-radius: 10px; cursor: pointer; transition: all 0.15s; }
  .provider-card.active { background: rgba(99,102,241,0.1); border-color: #6366f1; }
  .provider-card-label { font-size: 14px; font-weight: 600; color: #e8e8f0; margin-bottom: 2px; }
  .provider-card.active .provider-card-label { color: #6366f1; }
  .provider-card-sub { font-size: 12px; color: #6b7280; }
  @media (max-width: 640px) { .form-row { grid-template-columns: 1fr; } .provider-toggle { grid-template-columns: 1fr; } }
`;

function ApiKeyInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-wrap">
      <input className="form-input" type={show ? 'text' : 'password'} value={value} onChange={onChange}
        placeholder={placeholder} style={{ paddingRight: '40px' }} />
      <button type="button" className="pw-toggle" onClick={() => setShow(v => !v)}>
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

function MetaProviderPanel() {
  const [provider, setProvider] = useState('tmdb');
  const [tmdbKey, setTmdbKey] = useState('');
  const [tvdbKey, setTvdbKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    api.get('/settings/meta-provider').then(r => {
      setProvider(r.data.provider || 'tmdb');
      setTmdbKey(r.data.tmdb_api_key || '');
      setTvdbKey(r.data.tvdb_api_key || '');
    }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      await api.post('/settings/meta-provider', { provider, tmdb_api_key: tmdbKey, tvdb_api_key: tvdbKey });
      toast.success('Metadata provider saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const endpoint = provider === 'tvdb'
        ? '/search/tvdb?q=Breaking+Bad&type=series'
        : '/search/tmdb?q=Breaking+Bad&type=series';
      const r = await api.get(endpoint);
      const count = r.data.results?.length || 0;
      setTestResult({ ok: true, msg: 'Connected — ' + count + ' results for "Breaking Bad"' });
    } catch (err) {
      setTestResult({ ok: false, msg: err.response?.data?.error || 'Connection failed' });
    } finally { setTesting(false); }
  };

  return (
    <div>
      <p style={{fontSize:'13px',color:'#6b7280',marginBottom:'20px',lineHeight:'1.5'}}>
        Choose which metadata provider to use for searching and adding movies and TV shows.
      </p>
      <div className="provider-toggle">
        <div className={'provider-card ' + (provider === 'tmdb' ? 'active' : '')} onClick={() => setProvider('tmdb')}>
          <div className="provider-card-label">TMDB</div>
          <div className="provider-card-sub">The Movie Database</div>
        </div>
        <div className={'provider-card ' + (provider === 'tvdb' ? 'active' : '')} onClick={() => setProvider('tvdb')}>
          <div className="provider-card-label">TheTVDB</div>
          <div className="provider-card-sub">Best for TV shows</div>
        </div>
      </div>
      {provider === 'tmdb' && (
        <div className="form-group">
          <label className="form-label">TMDB API Key (v3)</label>
          <ApiKeyInput value={tmdbKey} onChange={e => setTmdbKey(e.target.value)} placeholder="Get yours at themoviedb.org/settings/api" />
          <div style={{fontSize:'12px',color:'#4b5563',marginTop:'4px'}}>
            Free key at <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer" style={{color:'#6366f1'}}>themoviedb.org/settings/api</a>
          </div>
        </div>
      )}
      {provider === 'tvdb' && (
        <div className="form-group">
          <label className="form-label">TheTVDB API Key (v4)</label>
          <ApiKeyInput value={tvdbKey} onChange={e => setTvdbKey(e.target.value)} placeholder="Get yours at thetvdb.com/api-information" />
          <div style={{fontSize:'12px',color:'#4b5563',marginTop:'4px'}}>
            Free key at <a href="https://www.thetvdb.com/api-information" target="_blank" rel="noreferrer" style={{color:'#6366f1'}}>thetvdb.com/api-information</a>
          </div>
        </div>
      )}
      {testResult && (
        <div className={'test-result ' + (testResult.ok ? 'test-ok' : 'test-fail')}>
          {testResult.ok ? <CheckCircle size={14} /> : <XCircle size={14} />} {testResult.msg}
        </div>
      )}
      <div className="btn-row" style={{marginTop:'14px'}}>
        <button className="btn-save" onClick={save} disabled={saving}><Save size={14} /> {saving ? 'Saving...' : 'Save'}</button>
        <button className="btn-test" onClick={test} disabled={testing}><TestTube size={14} /> {testing ? 'Testing...' : 'Test Connection'}</button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [sabUrl, setSabUrl] = useState('');
  const [sabKey, setSabKey] = useState('');
  const [hydraUrl, setHydraUrl] = useState('');
  const [hydraKey, setHydraKey] = useState('');
  const [moviesPath, setMoviesPath] = useState('/downloads/movies');
  const [seriesPath, setSeriesPath] = useState('/downloads/series');
  const [indexers, setIndexers] = useState([]);
  const [sabTest, setSabTest] = useState(null);
  const [hydraTest, setHydraTest] = useState(null);
  const [showAddIndexer, setShowAddIndexer] = useState(false);
  const [newIndexer, setNewIndexer] = useState({ name: '', type: 'newznab', url: '', api_key: '' });

  useEffect(() => {
    api.get('/settings').then(r => {
      const s = r.data;
      if (s.sabnzbd_url) setSabUrl(s.sabnzbd_url);
      if (s.hydra2_url) setHydraUrl(s.hydra2_url);
      if (s.download_path_movies) setMoviesPath(s.download_path_movies);
      if (s.download_path_series) setSeriesPath(s.download_path_series);
    }).catch(() => {});
    api.get('/settings/indexers').then(r => setIndexers(r.data)).catch(() => {});
  }, []);

  const saveSetting = async (key, value) => {
    try {
      await api.put('/settings', { key, value });
      toast.success('Saved');
    } catch { toast.error('Save failed'); }
  };

  const testConnection = async (type) => {
    const url = type === 'sabnzbd' ? sabUrl : hydraUrl;
    const key = type === 'sabnzbd' ? sabKey : hydraKey;
    if (!url || !key) { toast.error('URL and API Key required'); return; }
    try {
      const res = await api.post('/settings/test-connection', { type: type === 'hydra' ? 'hydra2' : type, url, api_key: key });
      const setter = type === 'sabnzbd' ? setSabTest : setHydraTest;
      setter({ ok: res.data.success, msg: res.data.message });
    } catch (err) {
      const setter = type === 'sabnzbd' ? setSabTest : setHydraTest;
      setter({ ok: false, msg: err.response?.data?.message || 'Connection failed' });
    }
  };

  const addIndexer = async () => {
    if (!newIndexer.name || !newIndexer.url) { toast.error('Name and URL required'); return; }
    try {
      await api.post('/settings/indexers', newIndexer);
      const res = await api.get('/settings/indexers');
      setIndexers(res.data);
      setShowAddIndexer(false);
      setNewIndexer({ name: '', type: 'newznab', url: '', api_key: '' });
      toast.success('Indexer added');
    } catch { toast.error('Failed to add indexer'); }
  };

  const deleteIndexer = async (id) => {
    try {
      await api.delete('/settings/indexers/' + id);
      setIndexers(prev => prev.filter(i => i.id !== id));
      toast.success('Indexer removed');
    } catch { toast.error('Error'); }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="settings-title">Settings</div>
      <div className="settings-sections">

        {/* Metadata Provider */}
        <div className="settings-card">
          <div className="card-title">🔍 Metadata Provider</div>
          <MetaProviderPanel />
        </div>

        {/* SABnzbd */}
        <div className="settings-card">
          <div className="card-title">📥 SABnzbd</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">URL</label>
              <input className="form-input" value={sabUrl} onChange={e => setSabUrl(e.target.value)} placeholder="http://192.168.1.x:8080" />
            </div>
            <div className="form-group">
              <label className="form-label">API Key</label>
              <ApiKeyInput value={sabKey} onChange={e => setSabKey(e.target.value)} placeholder="SABnzbd API Key" />
            </div>
          </div>
          {sabTest && (
            <div className={'test-result ' + (sabTest.ok ? 'test-ok' : 'test-fail')}>
              {sabTest.ok ? <CheckCircle size={14} /> : <XCircle size={14} />} {sabTest.msg}
            </div>
          )}
          <div className="btn-row" style={{marginTop:'12px'}}>
            <button className="btn-save" onClick={async () => { await saveSetting('sabnzbd_url', sabUrl); await saveSetting('sabnzbd_api_key', sabKey); }}>
              <Save size={14} /> Save
            </button>
            <button className="btn-test" onClick={() => testConnection('sabnzbd')}>
              <TestTube size={14} /> Test Connection
            </button>
          </div>
        </div>

        {/* NZBHydra2 */}
        <div className="settings-card">
          <div className="card-title">🔍 NZBHydra2</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">URL</label>
              <input className="form-input" value={hydraUrl} onChange={e => setHydraUrl(e.target.value)} placeholder="http://192.168.1.x:5076" />
            </div>
            <div className="form-group">
              <label className="form-label">API Key</label>
              <ApiKeyInput value={hydraKey} onChange={e => setHydraKey(e.target.value)} placeholder="NZBHydra2 API Key" />
            </div>
          </div>
          {hydraTest && (
            <div className={'test-result ' + (hydraTest.ok ? 'test-ok' : 'test-fail')}>
              {hydraTest.ok ? <CheckCircle size={14} /> : <XCircle size={14} />} {hydraTest.msg}
            </div>
          )}
          <div className="btn-row" style={{marginTop:'12px'}}>
            <button className="btn-save" onClick={async () => { await saveSetting('hydra2_url', hydraUrl); await saveSetting('hydra2_api_key', hydraKey); }}>
              <Save size={14} /> Save
            </button>
            <button className="btn-test" onClick={() => testConnection('hydra')}>
              <TestTube size={14} /> Test Connection
            </button>
          </div>
        </div>

        {/* Download Paths */}
        <div className="settings-card">
          <div className="card-title">📁 Download Paths</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Movies</label>
              <input className="form-input" value={moviesPath} onChange={e => setMoviesPath(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">TV Shows</label>
              <input className="form-input" value={seriesPath} onChange={e => setSeriesPath(e.target.value)} />
            </div>
          </div>
          <button className="btn-save" onClick={async () => { await saveSetting('download_path_movies', moviesPath); await saveSetting('download_path_series', seriesPath); }}>
            <Save size={14} /> Save
          </button>
        </div>

        {/* Indexers */}
        <div className="settings-card">
          <div className="card-title">🌐 Indexers</div>
          <div className="indexer-list">
            {indexers.length === 0 && <div style={{color:'#4b5563',fontSize:'14px'}}>No indexers configured yet</div>}
            {indexers.map(idx => (
              <div key={idx.id} className="indexer-row">
                <span className="indexer-name">{idx.name}</span>
                <span className="indexer-type">{idx.type}</span>
                <span className="indexer-url">{idx.url}</span>
                <button className="del-btn" onClick={() => deleteIndexer(idx.id)}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          {showAddIndexer ? (
            <div className="add-indexer-form">
              <div style={{fontSize:'13px',fontWeight:'600',color:'#9ca3af',marginBottom:'12px'}}>New Indexer</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="form-input" value={newIndexer.name} onChange={e => setNewIndexer(p => ({...p, name: e.target.value}))} placeholder="e.g. NZBgeek" />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-input" value={newIndexer.type} onChange={e => setNewIndexer(p => ({...p, type: e.target.value}))}>
                    <option value="newznab">Newznab (NZB)</option>
                    <option value="torznab">Torznab (Torrent)</option>
                    <option value="torrent_api">Torrent API</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">URL</label>
                  <input className="form-input" value={newIndexer.url} onChange={e => setNewIndexer(p => ({...p, url: e.target.value}))} placeholder="https://..." />
                </div>
                <div className="form-group">
                  <label className="form-label">API Key</label>
                  <input className="form-input" value={newIndexer.api_key} onChange={e => setNewIndexer(p => ({...p, api_key: e.target.value}))} placeholder="Optional" />
                </div>
              </div>
              <div className="btn-row">
                <button className="btn-save" onClick={addIndexer}><Plus size={14} /> Add</button>
                <button className="btn-test" onClick={() => setShowAddIndexer(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="btn-test" onClick={() => setShowAddIndexer(true)}>
              <Plus size={14} /> Add Indexer
            </button>
          )}
        </div>

      </div>
    </>
  );
}
