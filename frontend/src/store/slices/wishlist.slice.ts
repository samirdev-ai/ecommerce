import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export const wishlistSlice = createSlice({
  name: "wishlist",
  initialState: { ids: [] as string[] },
  reducers: {
    toggleWishlist(s, a: PayloadAction<string>) {
      const i = s.ids.indexOf(a.payload);
      if (i === -1) s.ids.unshift(a.payload);
      else s.ids.splice(i, 1);
    },
  },
});
