import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { queryKeys } from '../hooks/useQueries'
import './CriarListaForm.css'

// Retorna a data atual no formato YYYY-MM-DD
function dataHoje(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Validação: somente letras, números, espaços e barra /
const NOME_REGEX = /^[a-zA-ZÀ-ÿ0-9 /]*$/

interface CriarListaFormProps {
  disabled?: boolean
}

function CriarListaForm({ disabled }: CriarListaFormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [aberto, setAberto] = useState(false)
  const [data, setData] = useState(dataHoje())
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  function validar(): string | null {
    if (!data) return 'Informe a data da lista.'

    if (nome && !NOME_REGEX.test(nome)) {
      return 'O nome só pode conter letras, números e barra (/).'
    }

    if (nome && nome.length > 50) {
      return 'O nome pode ter no máximo 50 caracteres.'
    }

    return null
  }

  async function handleCriar() {
    const erroValidacao = validar()
    if (erroValidacao) {
      setErro(erroValidacao)
      return
    }

    setErro(null)
    setSalvando(true)

    try {
      // Monta o timestamp a partir da data (meia-noite)
      const dtCriacao = `${data}T00:00:00`

      // Se não informou nome, gera "Lista #X" (maior ID + 1)
      let descricao = nome.trim() || null
      if (!descricao) {
        const { data: maxRow } = await supabase
          .from('listas')
          .select('id_lista')
          .order('id_lista', { ascending: false })
          .limit(1)
          .single()

        const proximoId = (maxRow?.id_lista ?? 0) + 1
        descricao = `Lista #${proximoId}`
      }

      const { data: novaLista, error } = await supabase
        .from('listas')
        .insert({
          descricao,
          dt_criacao: dtCriacao,
          is_ativa: true,
        })
        .select('id_lista')
        .single()

      if (error) throw error

      // Invalida o cache de listas para atualizar os cards na Home
      await queryClient.invalidateQueries({ queryKey: queryKeys.listas })

      navigate(`/adicionar-itens/${novaLista.id_lista}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar lista.'
      setErro(msg)
    } finally {
      setSalvando(false)
    }
  }

  // Botão fechado → FAB simples
  if (!aberto) {
    return (
      <button
        id="btn-abrir-form"
        className="home-fab"
        onClick={() => setAberto(true)}
        aria-label="Criar nova lista"
        disabled={disabled}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span>Nova Lista</span>
      </button>
    )
  }

  // Formulário expandido
  return (
    <>
      {/* Backdrop */}
      <div className="criar-lista-backdrop" onClick={() => setAberto(false)} />

      {/* Bottom Sheet */}
      <div className="criar-lista-sheet">
        <div className="criar-lista-handle" />

        <h2 className="criar-lista-title">Nova Lista</h2>

        {/* Campo Data */}
        <div className="criar-lista-field">
          <label htmlFor="input-data" className="criar-lista-label">Data</label>
          <input
            id="input-data"
            type="date"
            className="criar-lista-input"
            value={data}
            onChange={(e) => { setData(e.target.value); setErro(null) }}
          />
        </div>

        {/* Campo Nome */}
        <div className="criar-lista-field">
          <label htmlFor="input-nome" className="criar-lista-label">
            Nome <span className="criar-lista-optional">(opcional)</span>
          </label>
          <input
            id="input-nome"
            type="text"
            className="criar-lista-input"
            placeholder="Ex: Compras da semana"
            maxLength={50}
            value={nome}
            onChange={(e) => { setNome(e.target.value); setErro(null) }}
          />
        </div>

        {/* Erro */}
        {erro && (
          <p className="criar-lista-erro">{erro}</p>
        )}

        {/* Botões */}
        <div className="criar-lista-actions">
          <button
            id="btn-cancelar"
            className="criar-lista-btn-cancelar"
            onClick={() => { setAberto(false); setErro(null); setNome(''); setData(dataHoje()) }}
            disabled={salvando}
          >
            Cancelar
          </button>
          <button
            id="btn-criar-lista"
            className="criar-lista-btn-criar"
            onClick={handleCriar}
            disabled={salvando}
          >
            {salvando ? 'Criando...' : 'Criar Lista'}
          </button>
        </div>
      </div>
    </>
  )
}

export default CriarListaForm
