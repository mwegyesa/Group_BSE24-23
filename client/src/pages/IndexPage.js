import Post from "../Post";
import {useEffect, useState} from "react";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000'

export default function IndexPage() {
  const [posts,setPosts] = useState([]);
  useEffect(() => {
    fetch(`${API_URL}/post`).then(response => {
      response.json().then(posts => {
        setPosts(posts);
      });
    });
  }, []);
  return (
    <>
      {posts.length > 0 && posts.map(post => (
        <Post {...post} />
      ))}
    </>
  );
}