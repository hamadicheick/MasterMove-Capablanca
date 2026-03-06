export const Store = {
  get(key, fallback=null){
    try{
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    }catch(_){
      return fallback;
    }
  },
  set(key, value){
    localStorage.setItem(key, JSON.stringify(value));
  },
  del(key){
    localStorage.removeItem(key);
  }
};
