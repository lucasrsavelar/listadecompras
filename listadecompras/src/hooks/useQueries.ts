import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Categoria, Medida, Observacao, Item, Lista, ListaItem } from '../models'

// ===== Types =====
export interface CategoriaComItens {
  categoria: Categoria
  itens: Item[]
}

// ===== Query Keys =====
export const queryKeys = {
  categorias: ['categorias'] as const,
  medidas: ['medidas'] as const,
  observacoes: ['observacoes'] as const,
  itens: ['itens'] as const,
  listas: ['listas'] as const,
  listaItens: (idLista: number) => ['lista_itens', idLista] as const,
}

// ===== Fetch functions =====
async function fetchCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .order('descricao')

  if (error) throw error
  return data as Categoria[]
}

async function fetchMedidas(): Promise<Medida[]> {
  const { data, error } = await supabase
    .from('medidas')
    .select('*')
    .order('descricao')

  if (error) throw error
  return data as Medida[]
}

async function fetchObservacoes(): Promise<Observacao[]> {
  const { data, error } = await supabase
    .from('observacoes')
    .select('*')
    .order('descricao')

  if (error) throw error
  return data as Observacao[]
}

async function fetchItens(): Promise<Item[]> {
  const { data, error } = await supabase
    .from('itens')
    .select('*')
    .eq('is_ativo', true)
    .order('nome_item')

  if (error) throw error
  return data as Item[]
}

async function fetchListas(): Promise<Lista[]> {
  const { data, error } = await supabase
    .from('listas')
    .select('*')
    .eq('is_ativa', true)
    .order('dt_criacao', { ascending: false })

  if (error) throw error
  return data as Lista[]
}

// ===== Hooks =====
// staleTime: Infinity → dados ficam em memória e nunca refetch automático
// Só atualiza via invalidação manual (refresh do usuário)

export function useCategorias() {
  return useQuery({
    queryKey: queryKeys.categorias,
    queryFn: fetchCategorias,
    staleTime: Infinity,
  })
}

export function useMedidas() {
  return useQuery({
    queryKey: queryKeys.medidas,
    queryFn: fetchMedidas,
    staleTime: Infinity,
  })
}

export function useObservacoes() {
  return useQuery({
    queryKey: queryKeys.observacoes,
    queryFn: fetchObservacoes,
    staleTime: Infinity,
  })
}

export function useItens() {
  return useQuery({
    queryKey: queryKeys.itens,
    queryFn: fetchItens,
    staleTime: Infinity,
  })
}

export function useListas() {
  return useQuery({
    queryKey: queryKeys.listas,
    queryFn: fetchListas,
    staleTime: Infinity,
  })
}

export function useListaItens(idLista: number | null) {
  return useQuery({
    queryKey: queryKeys.listaItens(idLista ?? 0),
    queryFn: async (): Promise<ListaItem[]> => {
      if (!idLista) return []
      const { data, error } = await supabase
        .from('lista_itens')
        .select('*')
        .eq('id_lista', idLista)
        .order('id_lista_item')

      if (error) throw error
      return data as ListaItem[]
    },
    enabled: idLista !== null,
    staleTime: Infinity,
  })
}

// ===== Hook derivado: itens agrupados por categoria =====
// Agrupa todos os itens em suas respectivas categorias.
// Um item aparece em todas as categorias que possui (id_categoria, id_categoria2, id_categoria3).
export function useItensPorCategoria(): {
  data: CategoriaComItens[]
  isLoading: boolean
} {
  const { data: categorias, isLoading: loadCat } = useCategorias()
  const { data: itens, isLoading: loadItens } = useItens()

  const data = useMemo(() => {
    if (!categorias || !itens) return []

    // Mapa: id_categoria → Item[]
    const mapa = new Map<number, Item[]>()
    for (const cat of categorias) {
      mapa.set(cat.id_categoria, [])
    }

    // Itera sobre cada item e adiciona em todas as suas categorias
    for (const item of itens) {
      const ids = [item.id_categoria, item.id_categoria2, item.id_categoria3]

      for (const id of ids) {
        if (id != null && mapa.has(id)) {
          mapa.get(id)!.push(item)
        }
      }
    }

    // Monta o array final, incluindo apenas categorias que possuem itens
    const resultado: CategoriaComItens[] = []
    for (const cat of categorias) {
      const itensCategoria = mapa.get(cat.id_categoria) ?? []
      if (itensCategoria.length > 0) {
        resultado.push({ categoria: cat, itens: itensCategoria })
      }
    }

    return resultado
  }, [categorias, itens])

  return { data, isLoading: loadCat || loadItens }
}

// ===== Refresh hook =====
// Invalida todos os caches e força um novo fetch do banco
export function useRefreshDados() {
  const queryClient = useQueryClient()

  return async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.categorias })
    await queryClient.invalidateQueries({ queryKey: queryKeys.medidas })
    await queryClient.invalidateQueries({ queryKey: queryKeys.observacoes })
    await queryClient.invalidateQueries({ queryKey: queryKeys.itens })
    await queryClient.invalidateQueries({ queryKey: queryKeys.listas })
  }
}

