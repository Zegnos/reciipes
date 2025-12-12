import React, { useState, useEffect } from "react";
import SubRecipeForm from "./SubRecipeForm";

const MySubrecipes = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/subrecipes`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setList(data);
      } else if (res.status === 401) {
        setList([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = () => {
    setEditing(null);
    setShowForm(true);
  };

  const handleSave = async (payload) => {
    try {
      if (editing) {
        const res = await fetch(`/api/subrecipes/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setShowForm(false);
          load();
        } else {
          const err = await res.json();
          alert(err.error || "Erreur");
        }
      } else {
        const res = await fetch(`/api/subrecipes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setShowForm(false);
          load();
        } else {
          const err = await res.json();
          alert(err.error || "Erreur");
        }
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau");
    }
  };

  const handleEdit = (item) => {
    setEditing(item);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Supprimer cette sous-recette ?")) return;
    const res = await fetch(`/api/subrecipes/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) load();
    else {
      const err = await res.json();
      alert(err.error || "Erreur");
    }
  };

  return (
    <div className="my-subrecipes">
      <h2>Library de sous-recettes</h2>
      <div style={{ marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={handleCreate}>
          Créer une sous-recette
        </button>
      </div>

      {showForm && (
        <div className="subrecipe-form" style={{ marginBottom: 24 }}>
          <SubRecipeForm
            initial={editing}
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#f2f2f2" }}>
          Chargement...
        </div>
      ) : (
        <div>
          {list.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                color: "#f2f2f2",
                opacity: 0.7,
              }}
            >
              Aucune sous-recette pour le moment.
            </div>
          ) : (
            <div className="my-subrecipes-list">
              {list.map((s) => (
                <div key={s.id} className="subrecipe-card-wrapper">
                  <div className="subrecipe-card">
                    {s.image_url ? (
                      <img src={s.image_url} alt={s.name} className="thumb" />
                    ) : (
                      <div className="thumb placeholder"></div>
                    )}
                    <div className="meta">
                      <div className="name">{s.name}</div>
                      {s.description && (
                        <div className="desc">{s.description}</div>
                      )}
                      <div className="actions">
                        <button
                          className="btn btn-secondary btn-small"
                          onClick={() => handleEdit(s)}
                        >
                          Éditer
                        </button>
                        <button
                          className="btn btn-danger btn-small"
                          onClick={() => handleDelete(s.id)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MySubrecipes;
