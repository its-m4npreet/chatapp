import React from "react";
import "../App.css";

const users = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
  { id: 3, name: "Charlie" },
];

export default function Sidebar({ onSelectUser, selectedUserId }) {
  return (
    <aside className="sidebar">
      <h2>Contacts</h2>
      <ul>
        {users.map((user) => (
          <li
            key={user.id}
            className={selectedUserId === user.id ? "selected" : ""}
            onClick={() => onSelectUser(user.id)}
          >
            {user.name}
          </li>
        ))}
      </ul>
    </aside>
  );
}
