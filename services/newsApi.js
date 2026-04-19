import axios from "axios";

const API_URL = "http://localhost:5000/api/news";

export const fetchNews = async () => {
  const res = await axios.get(API_URL);
  return res.data;
};

export const submitNews = async (news) => {
  const res = await axios.post(`${API_URL}/submit`, news);
  return res.data;
};

export const voteNews = async (id, type) => {
  const res = await axios.post(`${API_URL}/${id}/vote`, { type });
  return res.data;
};
