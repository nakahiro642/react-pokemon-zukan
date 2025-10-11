// src/pages/PokemonList.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { apiQueryKeys } from '../queryKeys';
import { fetchPokemonListWithJapaneseNames } from '../api/pokemonWithJapaneseName';
import type { PokemonWithJapaneseName } from '../api/pokemonWithJapaneseName';
import PokemonCard from '../components/PokemonCard';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const PokemonList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    isLoading,
  } = useInfiniteQuery({
    queryKey: [apiQueryKeys.pokemon.list()],
    queryFn: ({ pageParam = 0 }) => fetchPokemonListWithJapaneseNames(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.next) {
        return pages.length * 20;
      }
      return undefined;
    },
  });

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // フィルタリング処理
  const allPokemon = data?.pages.flatMap(page => page.results) || [];
  
  const filteredPokemon = allPokemon.filter((pokemon: PokemonWithJapaneseName) => {
    // 検索語が空の場合はすべて表示
    if (searchTerm === '') {
      return true;
    }
    
    // 検索語がある場合、部分一致で検索
    const searchLower = searchTerm.toLowerCase().trim();
    const matchesSearch = pokemon.japaneseName.toLowerCase().includes(searchLower) ||
                         pokemon.name.toLowerCase().includes(searchLower) ||
                         pokemon.number.includes(searchTerm.trim());
    
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-4">
              <Skeleton height={150} />
              <Skeleton count={2} className="mt-2" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (status === 'error') return <div className="p-4 text-red-600">エラーが発生しました</div>;

  return (
    <div className="p-4">
      
      <div className="mb-6 space-y-4">
  
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="ポケモン名で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        
        {searchTerm && (
          <div className="text-sm text-gray-600">
            {filteredPokemon.length}件のポケモンが見つかりました
          </div>
        )}
      </div>

    
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredPokemon.map((pokemon: PokemonWithJapaneseName) => (
          <PokemonCard key={`${pokemon.name}-${pokemon.number}`} pokemon={pokemon} />
        ))}
      </div>

  
      {!searchTerm && (
        <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
          {isFetchingNextPage ? (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span>読み込み中...</span>
            </div>
          ) : hasNextPage ? (
            <span className="text-gray-500">続きを読み込む</span>
          ) : (
            <span className="text-gray-400">すべて表示しました</span>
          )}
        </div>
      )}
    </div>
  );
};

export default PokemonList;