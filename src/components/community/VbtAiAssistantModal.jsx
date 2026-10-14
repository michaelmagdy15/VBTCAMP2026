import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Shield,
  Clock,
  Send,
  X,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  User,
  Award,
  Calendar,
  HelpCircle,
  Loader2,
  ArrowRight,
  Database,
  Flame,
  FileCheck
} from 'lucide-react';
import {
  ROLE_TIERS,
  getUserRoleTier,
  getSuggestedQuestions,
  formatDataFreshness,
  processAssistantQuery,
  executeConfirmedMutation,
  getCommunityAuditLogs,
} from '../../services/vbtAiAssistantService';

/**
 * Role badge styling configuration
 */
const ROLE_BADGE_CONFIG = {
  [ROLE_TIERS.COORDINATOR]: {
    label: 'Coordinator View',
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.4)',
    text: '#fbbf24',
    icon: Award,
  },
  [ROLE_TIERS.SERVANT]: {
    label: 'Servant View',
    bg: 'rgba(56, 189, 248, 0.15)',
    border: 'rgba(56, 189, 248, 0.4)',
    text: '#38bdf8',
    icon: Shield,
  },
  [ROLE_TIERS.MEMBER]: {
    label: 'Member View',
    bg: 'rgba(52, 211, 153, 0.15)',
    border: 'rgba(52, 211, 153, 0.4)',
    text: '#34d399',
    icon: User,
  },
};

/**
 * Format markdown bold and bullet list text safely into readable JSX
 */
function FormattedAssistantText({ text }) {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13.5, lineHeight: 1.55 }}>
      {lines.map((line, idx) => {
        if (!line.trim()) {
          return <div key={idx} style={{ height: 4 }} />;
        }

        const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
        const cleanLine = isBullet ? line.replace(/^[\s•-]+/, '').trim() : line;

        // Render bold segments (e.g. **bold**)
        const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
        const renderedLine = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={pIdx} style={{ color: '#f8fafc', fontWeight: 600 }}>
                {part.slice(2, -2)}
              </strong>
            );
          }
          if (part.startsWith('*') && part.endsWith('*')) {
            return (
              <em key={pIdx} style={{ color: '#94a3b8' }}>
                {part.slice(1, -1)}
              </em>
            );
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', paddingLeft: 4 }}>
              <span style={{ color: '#38bdf8', fontSize: 12, lineHeight: '18px' }}>●</span>
              <span style={{ color: '#e2e8f0', flex: 1 }}>{renderedLine}</span>
            </div>
          );
        }

        return (
          <p key={idx} style={{ margin: 0, color: '#e2e8f0' }}>
            {renderedLine}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Permission-Aware VBT AI Assistant Modal Component
 */
export default function VbtAiAssistantModal({
  isOpen,
  onClose,
  currentUser = null,
  communityContext = {},
  onMutationExecuted = null,
}) {
  if (!isOpen) return null;

  const roleTier = getUserRoleTier(currentUser);
  const badgeConfig = ROLE_BADGE_CONFIG[roleTier] || ROLE_BADGE_CONFIG[ROLE_TIERS.MEMBER];
  const BadgeIcon = badgeConfig.icon;

  const suggestedQuestions = getSuggestedQuestions(currentUser);
  const messagesEndRef = useRef(null);

  // Initial welcome greeting
  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome_1',
      sender: 'assistant',
      text: `👋 Peace and Grace! I am your **VBT Community AI Assistant**.\n\nI answer sports ministry questions tailored strictly to your **${badgeConfig.label}** permissions while protecting confidential member and pastoral records.\n\nTap any suggested question below or type your question:`,
      timestamp: new Date().toISOString(),
      roleTier,
      isAuthorized: true,
      suggestedActions: suggestedQuestions,
      freshness: formatDataFreshness(communityContext?.asOf),
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [executingMutationId, setExecutingMutationId] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  // Handle Query Submission
  const handleSendQuery = async (queryText) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || isThinking) return;

    setInputQuery('');
    setErrorStatus(null);

    const userMessageId = `usr_${Date.now()}`;
    const newMessages = [
      ...messages,
      {
        id: userMessageId,
        sender: 'user',
        text: textToSend,
        timestamp: new Date().toISOString(),
      },
    ];
    setMessages(newMessages);
    setIsThinking(true);

    try {
      const response = await processAssistantQuery(textToSend, currentUser, communityContext);

      setMessages((prev) => [
        ...prev,
        {
          id: `asst_${Date.now()}`,
          sender: 'assistant',
          text: response.answer,
          timestamp: new Date().toISOString(),
          roleTier: response.roleTier,
          intent: response.intent,
          isAuthorized: response.isAuthorized,
          safetyBlocked: response.safetyBlocked,
          requiresConfirmation: response.requiresConfirmation,
          stagedMutation: response.stagedMutation,
          freshness: response.freshness,
          uncertaintyNotes: response.uncertaintyNotes,
          suggestedActions: response.suggestedActions,
          data: response.data,
        },
      ]);
    } catch (err) {
      console.error('[VbtAiAssistantModal] Error processing assistant query:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `asst_err_${Date.now()}`,
          sender: 'assistant',
          text: '⚠️ An error occurred while evaluating your inquiry. Please try again or rephrase.',
          timestamp: new Date().toISOString(),
          isAuthorized: false,
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  // Handle Coordinator Explicit Mutation Execution
  const handleConfirmMutation = async (stagedMutationId, msgId) => {
    if (!stagedMutationId || executingMutationId) return;

    setExecutingMutationId(stagedMutationId);
    try {
      const result = await executeConfirmedMutation(stagedMutationId, currentUser);

      // Update message status in thread
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === msgId || (msg.stagedMutation && msg.stagedMutation.id === stagedMutationId)) {
            return {
              ...msg,
              requiresConfirmation: false,
              executedMutation: result.executedMutation,
              auditRecord: result.auditRecord,
            };
          }
          return msg;
        })
      );

      // Notify parent if callback provided
      if (typeof onMutationExecuted === 'function') {
        onMutationExecuted(result);
      }
    } catch (err) {
      console.error('[VbtAiAssistantModal] Mutation execution failed:', err);
      setErrorStatus(`Action execution failed: ${err.message}`);
    } finally {
      setExecutingMutationId(null);
    }
  };

  // Handle Cancel / Dismiss Mutation
  const handleDismissMutation = (stagedMutationId, msgId) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === msgId || (msg.stagedMutation && msg.stagedMutation.id === stagedMutationId)) {
          return {
            ...msg,
            requiresConfirmation: false,
            dismissed: true,
          };
        }
        return msg;
      })
    );
  };

  // Reset conversation
  const handleResetConversation = () => {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        sender: 'assistant',
        text: `Conversation cleared. How can I assist you in your ministry service today?`,
        timestamp: new Date().toISOString(),
        roleTier,
        isAuthorized: true,
        suggestedActions: suggestedQuestions,
        freshness: formatDataFreshness(communityContext?.asOf),
      },
    ]);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="VBT Ministry AI Assistant"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(3, 7, 18, 0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 680,
          height: '88vh',
          maxHeight: 760,
          background: 'linear-gradient(165deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: 20,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 30px rgba(56, 189, 248, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 23, 42, 0.95)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(56, 189, 248, 0.3)',
              }}
            >
              <Sparkles size={22} color="#ffffff" />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#f8fafc',
                    letterSpacing: '-0.01em',
                  }}
                >
                  VBT AI Assistant
                </h2>

                {/* Role Pill */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 8px',
                    borderRadius: 9999,
                    backgroundColor: badgeConfig.bg,
                    border: `1px solid ${badgeConfig.border}`,
                    fontSize: 11,
                    fontWeight: 600,
                    color: badgeConfig.text,
                  }}
                >
                  <BadgeIcon size={12} />
                  <span>{badgeConfig.label}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 3 }}>
                {/* Source Freshness Pill */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    color: '#94a3b8',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: '#10b981',
                      display: 'inline-block',
                    }}
                  />
                  <Clock size={11} />
                  <span>{formatDataFreshness(communityContext?.asOf)}</span>
                </div>

                <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>

                {/* Strict Safety Badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    color: '#a7f3d0',
                  }}
                >
                  <Shield size={11} color="#34d399" />
                  <span>Confidential Data Masked</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={handleResetConversation}
              title="Reset conversation"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                borderRadius: 8,
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <RotateCcw size={15} />
            </button>

            <button
              onClick={onClose}
              title="Close assistant"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                borderRadius: 8,
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ERROR STATUS ALERT (IF ANY) */}
        {errorStatus && (
          <div
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertTriangle size={14} />
            <span>{errorStatus}</span>
          </div>
        )}

        {/* QUICK SUGGESTED QUESTIONS CHIPS */}
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            scrollbarWidth: 'none',
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              paddingLeft: 4,
            }}
          >
            <HelpCircle size={12} />
            Quick:
          </span>

          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendQuery(q)}
              disabled={isThinking}
              style={{
                padding: '5px 12px',
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 500,
                color: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                cursor: isThinking ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* MESSAGES THREAD */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';

            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '100%',
                }}
              >
                {/* Bubble */}
                <div
                  style={{
                    maxWidth: isUser ? '80%' : '88%',
                    padding: '12px 16px',
                    borderRadius: 16,
                    backgroundColor: isUser ? '#0284c7' : 'rgba(30, 41, 59, 0.85)',
                    color: '#ffffff',
                    border: isUser
                      ? '1px solid rgba(56, 189, 248, 0.3)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: isUser
                      ? '0 4px 12px rgba(2, 132, 199, 0.25)'
                      : '0 4px 12px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  {isUser ? (
                    <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{msg.text}</div>
                  ) : (
                    <div>
                      {/* Safety Banner if blocked or restricted */}
                      {msg.safetyBlocked && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 10px',
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            borderRadius: 8,
                            color: '#f87171',
                            fontSize: 12,
                            fontWeight: 600,
                            marginBottom: 8,
                          }}
                        >
                          <Lock size={13} />
                          <span>Strict Safety Protection</span>
                        </div>
                      )}

                      {!msg.isAuthorized && !msg.safetyBlocked && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 10px',
                            backgroundColor: 'rgba(245, 158, 11, 0.15)',
                            border: '1px solid rgba(245, 158, 11, 0.35)',
                            borderRadius: 8,
                            color: '#fbbf24',
                            fontSize: 12,
                            fontWeight: 600,
                            marginBottom: 8,
                          }}
                        >
                          <Shield size={13} />
                          <span>Role-Restricted Inquiry</span>
                        </div>
                      )}

                      <FormattedAssistantText text={msg.text} />

                      {/* STAGED MUTATION CONFIRMATION CARD (Read-Only First) */}
                      {msg.requiresConfirmation && msg.stagedMutation && (
                        <div
                          style={{
                            marginTop: 12,
                            padding: '12px 14px',
                            backgroundColor: 'rgba(245, 158, 11, 0.08)',
                            border: '1px solid rgba(245, 158, 11, 0.35)',
                            borderRadius: 12,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#fbbf24',
                              marginBottom: 6,
                            }}
                          >
                            <AlertTriangle size={14} />
                            <span>Action Staged for Coordinator Confirmation</span>
                          </div>

                          <div style={{ fontSize: 13, color: '#f8fafc', fontWeight: 600 }}>
                            {msg.stagedMutation.summary}
                          </div>

                          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>
                            {msg.stagedMutation.impact}
                          </div>

                          <div
                            style={{
                              fontSize: 11,
                              color: '#fcd34d',
                              marginTop: 6,
                              padding: '4px 8px',
                              backgroundColor: 'rgba(245, 158, 11, 0.1)',
                              borderRadius: 6,
                              display: 'inline-block',
                            }}
                          >
                            🔒 AI Safety: Will not execute without explicit confirmation. Logged to Community Audit.
                          </div>

                          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                            <button
                              onClick={() =>
                                handleConfirmMutation(msg.stagedMutation.id, msg.id)
                              }
                              disabled={executingMutationId === msg.stagedMutation.id}
                              style={{
                                padding: '6px 14px',
                                borderRadius: 8,
                                border: 'none',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: '#ffffff',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                              }}
                            >
                              {executingMutationId === msg.stagedMutation.id ? (
                                <>
                                  <Loader2 size={13} className="spin" />
                                  <span>Executing...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={13} />
                                  <span>Confirm & Execute</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() =>
                                handleDismissMutation(msg.stagedMutation.id, msg.id)
                              }
                              style={{
                                padding: '6px 12px',
                                borderRadius: 8,
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: '#94a3b8',
                                fontSize: 12,
                                fontWeight: 500,
                                cursor: 'pointer',
                              }}
                            >
                              Cancel / Dismiss
                            </button>
                          </div>
                        </div>
                      )}

                      {/* EXECUTED AUDIT BADGE */}
                      {msg.executedMutation && (
                        <div
                          style={{
                            marginTop: 10,
                            padding: '8px 12px',
                            backgroundColor: 'rgba(16, 185, 129, 0.12)',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                            borderRadius: 10,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <FileCheck size={16} color="#34d399" />
                          <div style={{ fontSize: 12 }}>
                            <span style={{ color: '#34d399', fontWeight: 600 }}>
                              Executed & Logged to Community Audit
                            </span>
                            <div style={{ color: '#94a3b8', fontSize: 11 }}>
                              Audit Record ID: {msg.auditRecord?.id || 'audit_logged'}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Uncertainty & Freshness Footer */}
                      {msg.freshness && (
                        <div
                          style={{
                            marginTop: 8,
                            paddingTop: 8,
                            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 11,
                            color: '#64748b',
                          }}
                        >
                          <Database size={11} />
                          <span>{msg.freshness}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Follow-up suggestion actions */}
                {!isUser && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                      marginTop: 8,
                      maxWidth: '88%',
                    }}
                  >
                    {msg.suggestedActions.slice(0, 3).map((actionText, aIdx) => (
                      <button
                        key={aIdx}
                        onClick={() => handleSendQuery(actionText)}
                        disabled={isThinking}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 9999,
                          fontSize: 11,
                          fontWeight: 500,
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#cbd5e1',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>{actionText}</span>
                        <ArrowRight size={10} color="#38bdf8" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Thinking Indicator */}
          {isThinking && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 16,
                  backgroundColor: 'rgba(30, 41, 59, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#94a3b8',
                  fontSize: 12.5,
                }}
              >
                <Loader2 size={14} className="spin" color="#38bdf8" />
                <span>Evaluating role permissions and generating response...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* INPUT FORM */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendQuery();
          }}
          style={{
            padding: '12px 16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={
              roleTier === ROLE_TIERS.COORDINATOR
                ? 'Ask about Friday availability, unfilled stations, or schedule drafts...'
                : roleTier === ROLE_TIERS.SERVANT
                ? 'Ask about station prep, arrival time, or team members...'
                : 'Ask what you are serving in, meeting times, or check-in location...'
            }
            disabled={isThinking}
            style={{
              flex: 1,
              backgroundColor: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 12,
              padding: '10px 14px',
              fontSize: 13.5,
              color: '#f8fafc',
              outline: 'none',
              transition: 'border 0.2s ease',
            }}
          />

          <button
            type="submit"
            disabled={!inputQuery.trim() || isThinking}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              border: 'none',
              background: !inputQuery.trim() || isThinking
                ? 'rgba(255, 255, 255, 0.08)'
                : 'linear-gradient(135deg, #0284c7, #38bdf8)',
              color: !inputQuery.trim() || isThinking ? '#64748b' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: !inputQuery.trim() || isThinking ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: inputQuery.trim() && !isThinking ? '0 4px 12px rgba(56, 189, 248, 0.3)' : 'none',
            }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
