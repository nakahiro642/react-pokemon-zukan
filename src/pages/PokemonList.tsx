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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [allPokemonForSearch, setAllPokemonForSearch] = useState<PokemonWithJapaneseName[]>([]);
  
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

  // PokeAPIから全ポケモンデータを取得
  useEffect(() => {
    const fetchAllPokemon = async () => {
      try {
        console.log('全ポケモンデータ取得開始...');
        const batchSize = 100;
        const allPokemon: PokemonWithJapaneseName[] = [];
        
        const initialResponse = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1');
        const initialData = await initialResponse.json();
        const totalCount = Math.min(initialData.count, 500); 

        for (let offset = 0; offset < totalCount; offset += batchSize) {
          const batchData = await fetchPokemonListWithJapaneseNames(offset, batchSize);
          allPokemon.push(...batchData.results);
          console.log(`取得済み: ${allPokemon.length}/${totalCount}件`);
        }
        
        setAllPokemonForSearch(allPokemon);
        console.log(`全ポケモンデータ取得完了: ${allPokemon.length}件`);
      } catch (error) {
        console.error('全ポケモンデータの取得に失敗:', error);
      }
    };

    fetchAllPokemon();
  }, []);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage && !searchTerm) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, searchTerm]);

  const filteredPokemon = React.useMemo(() => {
    if (!searchTerm.trim()) {
      // 検索がない場合は無限スクロールで読み込んだデータを表示
      return data?.pages.flatMap(page => page.results) || [];
    }
    
    // 検索がある場合は全ポケモンから検索
    const searchLower = searchTerm.toLowerCase().trim();
    
    return allPokemonForSearch.filter((pokemon: PokemonWithJapaneseName) => {
      const matchesName = pokemon.japaneseName.toLowerCase().includes(searchLower) ||
                         pokemon.name.toLowerCase().includes(searchLower);
      const matchesNumber = pokemon.number.toString().includes(searchTerm.trim());
      
      return matchesName || matchesNumber;
    });
  }, [data, searchTerm, allPokemonForSearch]);

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
      
      {/* 上部の検索バー */}
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

        {searchTerm.trim() && (
          <div className="text-sm text-gray-600">
            {filteredPokemon.length}件のポケモンが見つかりました
            {allPokemonForSearch.length === 0 && '（検索データ読み込み中...）'}
          </div>
        )}
      </div>

      {/* 検索モーダル */}
      {isSearchOpen && (
        <div 
          className="fixed inset-0 z-40 flex items-start justify-center pt-20 px-4 animate-fadeIn"
          style={{backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
          onClick={() => setIsSearchOpen(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 space-y-4 animate-slideDown"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">ポケモン検索</h2>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            <input
              type="text"
              placeholder="ポケモン名で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              autoFocus
            />
            
            {searchTerm.trim() && (
              <div className="text-sm text-gray-600">
                {filteredPokemon.length}件のポケモンが見つかりました
                {allPokemonForSearch.length === 0 && '（検索データ読み込み中...）'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* フローティング検索ボタン */}
      <button
        onClick={() => setIsSearchOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center z-30 transition-all duration-200 hover:scale-110"
        aria-label="検索"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </button>
    
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredPokemon.map((pokemon: PokemonWithJapaneseName) => (
          <PokemonCard key={`${pokemon.name}-${pokemon.number}`} pokemon={pokemon} />
        ))}
      </div>

  
      {!searchTerm.trim() && (
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