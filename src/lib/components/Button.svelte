<script lang="ts">
  let {
    onclick,
    disabled = false,
    title = '',
    variant = 'secondary',
    class: className = '',
    children,
  }: {
    onclick?: () => void;
    disabled?: boolean;
    title?: string;
    variant?: 'primary' | 'secondary';
    class?: string;
    children: any;
  } = $props();
</script>

<button
  class="btn {variant} {className}"
  {onclick}
  {disabled}
  {title}
>
  {@render children()}
</button>

<style>
  .btn {
    padding: 0.4rem 0.75rem;
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.2s;
    white-space: nowrap;
    border: none;
  }
  
  .primary {
    background-color: #646cff;
    color: white;
    border: none;
  }
  
  .primary:hover:not(:disabled) {
    background-color: #535bf2;
  }
  
  .secondary {
    background-color: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .secondary:hover:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.9);
  }
  
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
